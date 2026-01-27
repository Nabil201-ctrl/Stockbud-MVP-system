import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { ShopifyService } from '../shopify/shopify.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';

export interface Report {
    id: string;
    userId: string;
    title: string;
    type: 'sales' | 'inventory' | 'revenue' | 'weekly' | 'monthly';
    status: 'generating' | 'ready' | 'failed';
    createdAt: Date;
    data?: any;
    description: string;
}

@Injectable()
export class ReportsService {
    private reportsFilePath = path.join(__dirname, '../../data/reports.json');
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly usersService: UsersService,
        private readonly shopifyService: ShopifyService,
        private readonly notificationsService: NotificationsService,
        private readonly configService: ConfigService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        } else {
            console.warn('GEMINI_API_KEY is not set. Reports will use templates.');
        }
        this.ensureDataFile();
    }

    private ensureDataFile() {
        const dir = path.dirname(this.reportsFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.reportsFilePath)) {
            fs.writeFileSync(this.reportsFilePath, JSON.stringify([]));
        }
    }

    private loadReports(): Report[] {
        try {
            const data = fs.readFileSync(this.reportsFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    private saveReports(reports: Report[]) {
        fs.writeFileSync(this.reportsFilePath, JSON.stringify(reports, null, 2));
    }

    async getReports(userId: string): Promise<Report[]> {
        const reports = this.loadReports();
        return reports
            .filter(r => r.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async generateReport(userId: string, type: 'sales' | 'inventory' | 'revenue'): Promise<Report> {
        const user = await this.usersService.findById(userId);
        const shop = user?.shopifyShop;
        const token = await this.usersService.getDecryptedShopifyToken(userId);

        const reportId = Math.random().toString(36).substr(2, 9);
        const titles = {
            sales: 'Weekly Sales Summary',
            inventory: 'Inventory Status Report',
            revenue: 'Monthly Revenue Analysis'
        };
        const descriptions = {
            sales: 'Overview of sales performance for the past week',
            inventory: 'Current stock levels and low inventory alerts',
            revenue: 'Detailed breakdown of monthly revenue streams'
        };

        // Create report entry
        const report: Report = {
            id: reportId,
            userId,
            title: titles[type],
            type,
            status: 'generating',
            createdAt: new Date(),
            description: descriptions[type]
        };

        const reports = this.loadReports();
        reports.push(report);
        this.saveReports(reports);

        // Generate report data asynchronously
        this.generateReportData(reportId, shop, token, type);

        return report;
    }

    private async generateReportData(reportId: string, shop: string, token: string, type: string) {
        try {
            // Get current stats from dashboard
            const stats = await this.dashboardService.getStats(shop, token);

            let reportData: any = {};
            let aiContent = "";

            // Prepare prompt for AI
            const statsSummary = JSON.stringify(stats, null, 2);
            const prompt = `
                You are a professional business analyst. Generate a detailed, professional ${type} report for an e-commerce store owner based on the following data:
                ${statsSummary}

                The report should be in Markdown format and include the following sections:
                1. **Executive Summary**: A brief overview of performance.
                2. **Key Findings**: Bullet points of the most important metrics and trends.
                3. **Detailed Analysis**: A deeper dive into the numbers (discuss revenue, products, sources etc).
                4. **Recommendations**: Actionable advice based on the data.
                
                Use bolding for emphasis. Use lists where appropriate. Keep the tone professional but encouraging.
                Do not include any "Here is the report" preamble, start directly with the report content.
            `;

            if (this.model) {
                try {
                    const result = await this.model.generateContent(prompt);
                    aiContent = result.response.text();
                } catch (err) {
                    console.error("AI Generation failed, using fallback", err);
                    aiContent = "## Report Generation Failed\n\nCould not generate the narrative report at this time. Please review the raw data below.";
                }
            } else {
                aiContent = "## AI Not Configured\n\nPlease configure the GEMINI_API_KEY to enable AI-generated reports.";
            }

            switch (type) {
                case 'sales':
                case 'weekly': // Weekly is treated similar to sales but with specific prompt
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue.total,
                            revenueChange: stats.revenue.change,
                            topProducts: stats.topProducts
                        },
                        raw: stats, // Keep raw stats for charts if needed
                        generatedAt: new Date().toISOString()
                    };
                    break;
                case 'inventory':
                    let inventoryStats: any = stats.topProducts;
                    let inventorySummary = aiContent;

                    try {
                        const products = await this.shopifyService.getProducts(shop, token);
                        if (products && products.length > 0) {
                            const totalStock = products.reduce((sum, p) => sum + (p.variants?.reduce((vSum, v) => vSum + (v.inventory_quantity || 0), 0) || 0), 0);
                            const lowStockProducts = products.filter(p => p.variants?.some(v => v.inventory_quantity < 10)).map(p => p.title);
                            const outOfStockProducts = products.filter(p => p.variants?.every(v => v.inventory_quantity === 0)).map(p => p.title);

                            inventoryStats = {
                                totalProducts: products.length,
                                totalStockItems: totalStock,
                                lowStockCount: lowStockProducts.length,
                                outOfStockCount: outOfStockProducts.length,
                                topProducts: stats.topProducts // Keep sales-based top products as well
                            };

                            // Regenerate AI content with REAL inventory data if we have it
                            if (this.model) {
                                const inventoryPrompt = `
                                    You are a professional business analyst. Generate a detailed Inventory Report based on the following REAL inventory data from Shopify:
                                    - Total Products: ${products.length}
                                    - Total Stock Items: ${totalStock}
                                    - Low Stock Products (${lowStockProducts.length}): ${lowStockProducts.join(', ') || 'None'}
                                    - Out of Stock Products (${outOfStockProducts.length}): ${outOfStockProducts.join(', ') || 'None'}
                                    
                                    Also consider this sales context: ${JSON.stringify(stats.topProducts)}

                                    Structure the report with:
                                    1. **Inventory Overview**: High-level summary.
                                    2. **Stock Health**: Analysis of stock levels.
                                    3. **Restock Recommendations**: Specific advice based on low/out of stock items.
                                `;
                                const result = await this.model.generateContent(inventoryPrompt);
                                inventorySummary = result.response.text();
                            }
                        }
                    } catch (err) {
                        console.error('Failed to fetch real inventory data for report', err);
                    }

                    reportData = {
                        content: inventorySummary,
                        stats: inventoryStats,
                        raw: stats,
                        generatedAt: new Date().toISOString()
                    };
                    break;
                case 'revenue':
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue.total,
                            profitMargin: stats.revenue.total * 0.3, // Mock profit margin
                            growth: stats.revenue.change
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString()
                    };
                    break;
                case 'monthly':
                    // Monthly logic is handled separately in handleMonthlyReport usually, 
                    // but if triggered manually we use this flow.
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue.total,
                            growth: stats.revenue.change
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString()
                    };
                    break;
            }

            // Update report with data
            const reports = this.loadReports();
            const idx = reports.findIndex(r => r.id === reportId);
            if (idx !== -1) {
                reports[idx].status = 'ready';
                reports[idx].data = reportData;
                this.saveReports(reports);

                // Notify User
                await this.notificationsService.create(
                    reportData.raw.userId || reports[idx].userId, // Fallback to report userId if raw missing
                    'Report Ready',
                    `Your ${type} report "${reports[idx].title}" has been successfully generated.`,
                    'success'
                );
            }
        } catch (error) {
            console.error('Report generation failed:', error);
            const reports = this.loadReports();
            const idx = reports.findIndex(r => r.id === reportId);
            if (idx !== -1) {
                reports[idx].status = 'failed';
                this.saveReports(reports);

                // Notify User of Failure
                await this.notificationsService.create(
                    reports[idx].userId,
                    'Report Failed',
                    `Your ${type} report "${reports[idx].title}" failed to generate. Please try again.`,
                    'error'
                );
            }
        }
    }

    // Monthly Aggregation Report Cron
    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
    async handleMonthlyReport() {
        console.log('Generating Monthly Aggregation Reports...');
        const allUsers = await this.usersService.getAllUsers();

        for (const user of allUsers) {
            if (user.shopifyShop && user.shopifyToken) {
                await this.generateMonthlyAggregation(user.id);
            }
        }
    }

    private async generateMonthlyAggregation(userId: string) {
        // 1. Fetch Weekly reports from last 30 days
        const allReports = await this.getReports(userId);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

        const recentWeeklyReports = allReports.filter(r =>
            (r.type === 'weekly' || r.type === 'sales') &&
            new Date(r.createdAt) > thirtyDaysAgo &&
            r.status === 'ready'
        );

        if (recentWeeklyReports.length === 0) {
            console.log(`No weekly reports found for user ${userId} to aggregate.`);
            return;
        }

        // 2. Aggregate Data
        let totalRev = 0;
        let summaryText = "Based on your weekly reports:\n";

        recentWeeklyReports.forEach((r, index) => {
            const rev = r.data?.stats?.totalRevenue || 0;
            totalRev += rev;
            summaryText += `- Week ${index + 1}: Revenue $${rev}\n`;
        });

        const avgRev = totalRev / recentWeeklyReports.length;

        // 3. Generate Monthly Report Entry
        const report = await this.generateReport(userId, 'monthly' as any); // Cast because type check might fail in IDE

        // 4. Generate AI Analysis
        const prompt = `
            Generate a comprehensive Monthly Executive Report by analyzing these weekly summaries:
            ${summaryText}

            Total aggregated revenue from reports: $${totalRev}
            Average weekly revenue: $${avgRev.toFixed(0)}

            Provide high-level strategic insights, identify consistency or volatility, and suggest focus areas for next month.
        `;

        let content = "Monthly Aggregation: ";
        if (this.model) {
            const result = await this.model.generateContent(prompt);
            content = result.response.text();
        } else {
            content += "AI Analysis unavailable. " + summaryText;
        }

        // 5. Update Report
        const reports = this.loadReports();
        const idx = reports.findIndex(r => r.id === report.id);
        if (idx !== -1) {
            reports[idx].status = 'ready';
            reports[idx].data = {
                content: content,
                stats: {
                    totalRevenue: totalRev,
                    reportCount: recentWeeklyReports.length
                },
                generatedAt: new Date().toISOString()
            };
            this.saveReports(reports);

            await this.notificationsService.create(userId, 'Monthly Report', 'Your monthly aggregated report is ready.', 'success');
        }
    }

    async getReportById(userId: string, reportId: string): Promise<Report | null> {
        const reports = this.loadReports();
        return reports.find(r => r.id === reportId && r.userId === userId) || null;
    }

    async deleteReport(userId: string, reportId: string): Promise<boolean> {
        const reports = this.loadReports();
        const filtered = reports.filter(r => !(r.id === reportId && r.userId === userId));
        if (filtered.length < reports.length) {
            this.saveReports(filtered);
            return true;
        }
        return false;
    }

    async getQuickStats(userId: string): Promise<any> {
        const user = await this.usersService.findById(userId);
        const shop = user?.shopifyShop;
        const token = await this.usersService.getDecryptedShopifyToken(userId);

        const stats = await this.dashboardService.getStats(shop, token);

        return {
            totalRevenue: stats.revenue.total || 0,
            revenueChange: stats.revenue.change || 0,
            productCount: stats.topProducts?.length || 0,
            orderCount: stats.salesHistory?.length || 0,
            lostRevenue: stats.revenue.lost || 0
        };
    }
    // Cleanup Old Reports Cron
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldReports() {
        console.log('Running daily report cleanup...');
        const reports = this.loadReports();
        const users = await this.usersService.getAllUsers();
        const userRetention = new Map(users.map(u => [u.id, u.retentionMonths || 3]));

        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        const appsKept = reports.filter(report => {
            const retentionMonths = userRetention.get(report.userId) || 3;
            const retentionMs = retentionMonths * THIRTY_DAYS_MS;
            const reportAge = now - new Date(report.createdAt).getTime();

            if (reportAge > retentionMs) {
                deletedCount++;
                return false; // Remove
            }
            return true; // Keep
        });

        if (deletedCount > 0) {
            this.saveReports(appsKept);
            console.log(`[Cleanup] Deleted ${deletedCount} expired reports.`);
        }
    }
}
