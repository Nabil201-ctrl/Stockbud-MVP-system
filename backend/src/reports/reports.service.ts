import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
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
    type: 'sales' | 'inventory' | 'revenue';
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
                    reportData = {
                        content: aiContent,
                        stats: {
                            topProducts: stats.topProducts
                        },
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
}
