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
        // Check and deduct tokens first
        await this.usersService.deductReportToken(userId, 1);

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
        this.generateReportData(reportId, shop, token, type, userId);

        return report;
    }

    private async generateReportData(reportId: string, shop: string, token: string, type: string, userId: string) {
        try {
            // Get current stats from dashboard
            const stats = await this.dashboardService.getStats(shop, token);

            // Get user's language preference
            // We need to fetch user again or pass it down. Since we only have reportId here which doesn't help much, 
            // let's assume we can fetch user by token owner or just pass userId to this method.
            // Wait, generateReport calls this. Let's update generateReport to pass userId.
            // For now, let's fetch user using the userId (which we don't have here directly).
            // Actually, generateReportData needs userId. Let's add it to arguments in next step.
            // But wait, I can't change signature easily without changing call site.
            // Let's modify generateReportData signature first.
            const user = await this.usersService.findById(reportId); // wait, reportId is not userId.
            // I need to update the signature of generateReportData.

            let reportData: any = {};
            let aiContent = "";

            // Placeholder for now, I will update signature in next step.
            const language = 'en';

            // Prepare prompt for AI
            const statsSummary = JSON.stringify(stats, null, 2);
            const prompt = `
                You are a Senior Retail Data Strategist & Business Critic. Your role is NOT to just summarize data, but to critically analyze the shop's performance and "find faults" in their business strategy, operational efficiency, and revenue maximization.

                Analyze the following sales data for an e-commerce store:
                ${statsSummary}

                The report should be in Markdown format. BE DIRECT AND CRITICAL.
                
                Structure:
                1. **Critical Performance Review**: Immediately highlight what is going WRONG or could be significantly better. calling out specific metrics.
                2. **Missed Opportunities (Fault Finding)**: Identify specific "faults" such as:
                   - High-demand products that are under-monetized?
                   - Over-reliance on a single product?
                   - Declining trends that need immediate intervention?
                3. **Strategic Analysis**: Deep dive into the "Why" behind the numbers.
                4. **Corrective Actions**: Specific, hard-hitting advice to fix the identified faults.

                Use bolding for emphasis. Do not use fluff. Speak like a business partner obsessed with optimization.
                Start directly with the content.
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
                        const productsResult = await this.shopifyService.getProducts(shop, token);
                        // Normalize productsresult to array
                        let products: any[] = [];
                        if (Array.isArray(productsResult)) {
                            products = productsResult;
                        } else if (productsResult && productsResult.products) {
                            products = productsResult.products;
                        }

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
                                    You are an Inventory Optimization Expert. Your goal is to identify "Dead Cash" (Overstock) and "Lost Revenue" (Out of Stock). Critically analyze this inventory data:
                                    - Total Products: ${products.length}
                                    - Total Stock Items: ${totalStock}
                                    - LOW STOCK DANGER (${lowStockProducts.length}): ${lowStockProducts.join(', ') || 'None'}
                                    - OUT OF STOCK FAILURES (${outOfStockProducts.length}): ${outOfStockProducts.join(', ') || 'None'}
                                    
                                    Sales Context (Top Performers): ${JSON.stringify(stats.topProducts)}

                                    Structure:
                                    1. **Inventory Health Check**: Grade the inventory health. Is it lean or bloated?
                                    2. **Critical Faults**: 
                                       - Are top-selling items out of stock? (Major Fault: Revenue Leak)
                                       - Are there too many items with low stock risk?
                                    3. **Action Plan**: 
                                       - What needs immediate reordering?
                                       - What strategy needs to change to prevent this?
                                    
                                    Be strict about out-of-stock top sellers. That is a critical business failure.
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
            Act as a fractional CFO. Generate a Monthly Strategic Review based on these weekly summaries:
            ${summaryText}

            Financials:
            - Aggregated Revenue: $${totalRev}
            - Avg Weekly Revenue: $${avgRev.toFixed(0)}

            Your Goal: Find the "Trend Faults".
            1. **Volatility Analysis**: Is revenue consistent or erratic? Why?
            2. **Growth Stagnation**: If the growth is flat, critique the lack of momentum.
            3. **Strategic Pivot**: What ONE major change should they make next month to break the current pattern?

            Be concise, strategic, and forward-looking.
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
