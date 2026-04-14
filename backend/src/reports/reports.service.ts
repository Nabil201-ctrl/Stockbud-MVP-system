import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { ShopifyService } from '../shopify/shopify.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../common/gemini.service';
import { UsageService } from '../common/usage.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { EmailBatchService } from '../email/email-batch.service';
import { DocxGeneratorService } from '../email/docx-generator.service';
import { PlanService } from '../common/plan.service';
import { AnalyticsService } from '../common/analytics.service';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import * as fs from 'fs';
import * as path from 'path';

export interface Report {
    id: string;
    userId: string;
    title: string;
    type: 'sales' | 'inventory' | 'revenue' | 'weekly' | 'monthly' | 'welcome' | 'instant';
    status: 'generating' | 'ready' | 'failed';
    createdAt: Date;
    data?: any;
    description: string;
    emailSent?: boolean;
    docxBase64?: string;
}

@Injectable()
export class ReportsService {
    private reportsFilePath = path.join(__dirname, '../../data/reports.json');

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly usersService: UsersService,
        @Inject(forwardRef(() => ShopifyService))
        private readonly shopifyService: ShopifyService,
        private readonly notificationsService: NotificationsService,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
        private readonly emailBatchService: EmailBatchService,
        private readonly docxGeneratorService: DocxGeneratorService,
        private readonly geminiService: GeminiService,
        private readonly usageService: UsageService,
        private readonly planService: PlanService,
        private readonly analyticsService: AnalyticsService,
        @InjectMetric('reports_generated_total')
        private readonly reportsCounter: Counter<string>,
        @InjectMetric('ai_usage_tokens_total')
        private readonly tokensCounter: Counter<string>,
    ) {
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

    async getQuickStats(userId: string) {
        const reports = await this.getReports(userId);
        return {
            total: reports.length,
            ready: reports.filter(r => r.status === 'ready').length,
            generating: reports.filter(r => r.status === 'generating').length,
            failed: reports.filter(r => r.status === 'failed').length,
        };
    }


    async generateReport(userId: string, type: 'sales' | 'inventory' | 'revenue' | 'weekly' | 'monthly' | 'welcome' | 'instant'): Promise<Report> {
        const user = await this.usersService.findById(userId);
        if (!user) throw new Error('User not found');

        // Check if plan allows this report type
        const check = this.planService.canGenerateReport(user, type);
        if (!check.allowed) {
            throw new Error(check.reason || `Your plan does not support generating '${type}' reports.`);
        }

        if (type === 'sales' || type === 'inventory' || type === 'revenue' || type === 'instant') {
            await this.usersService.deductReportToken(userId, 1);
        }

        const shop = user?.shopifyShop;
        const token = await this.usersService.getDecryptedShopifyToken(userId);

        const reportId = Math.random().toString(36).substr(2, 9);
        const titles: any = {
            sales: 'Weekly Sales Summary',
            inventory: 'Inventory Status Report',
            revenue: 'Monthly Revenue Analysis',
            weekly: `Weekly Performance Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            monthly: `Monthly Business Review — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            welcome: `Welcome Analysis — ${shop || 'Your Store'}`,
            instant: `Instant System Review — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        };
        const descriptions: any = {
            sales: 'Overview of sales performance for the past week',
            inventory: 'Current stock levels and low inventory alerts',
            revenue: 'Detailed breakdown of monthly revenue streams',
            weekly: 'AI-powered critical analysis of your weekly store performance',
            monthly: 'Comprehensive monthly review with trend analysis and strategic recommendations',
            welcome: 'First-time analysis of your store when you connected to StockBud',
            instant: 'On-demand comprehensive system review of your entire store',
        };

        const report: Report = {
            id: reportId,
            userId,
            title: titles[type],
            type,
            status: 'generating',
            createdAt: new Date(),
            description: descriptions[type],
            emailSent: false,
        };

        const reports = this.loadReports();
        reports.push(report);
        this.saveReports(reports);

        // Deep data collection: log the action
        await this.analyticsService.trackAction(userId, 'GENERATE_REPORT', 'report', reportId, { type });
        // Prometheus metric
        this.reportsCounter.inc({ type });

        this.generateReportData(reportId, shop, token, type, userId);

        return report;
    }

    private async generateReportData(reportId: string, shop: string, token: string, type: string, userId: string) {
        try {
            const user = await this.usersService.findById(userId);

            // Build stores array for unified dashboard stats
            const shopifyStores: { shop: string; token: string; targetType: string; targetValue: number }[] = [];
            for (const store of ((user as any)?.shopifyStores || [])) {
                try {
                    const decryptedToken = (this.usersService as any).encryptionService.decrypt(store.token);
                    shopifyStores.push({
                        shop: store.shop,
                        token: decryptedToken,
                        targetType: store.targetType || 'monthly',
                        targetValue: store.targetValue || 0,
                    });
                } catch (e) {
                    console.error(`[Reports] Failed to decrypt token for store ${store.shop}:`, e.message);
                }
            }

            const stats = await this.dashboardService.getStats(userId, shopifyStores);

            let reportData: any = {};
            let aiContent = "";

            const statsSummary = JSON.stringify(stats, null, 2);

            switch (type) {
                case 'weekly':
                case 'sales': {
                    const prompt = this.buildWeeklyPrompt(statsSummary);
                    aiContent = await this.generateAIContent(prompt, userId);
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue?.total || 0,
                            revenueChange: stats.revenue?.change || 0,
                            topProducts: stats.topProducts,
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString(),
                    };
                    break;
                }

                case 'inventory': {
                    let inventoryStats: any = stats.topProducts;
                    let inventorySummary = "";

                    try {
                        const productsResult = await this.shopifyService.getProducts(shop, token);
                        let products: any[] = Array.isArray(productsResult) ? productsResult : (productsResult?.products || []);

                        if (products.length > 0) {
                            const totalStock = products.reduce((sum, p) => sum + (p.variants?.reduce((vSum, v) => vSum + (v.inventory_quantity || 0), 0) || 0), 0);
                            const lowStockProducts = products.filter(p => p.variants?.some(v => v.inventory_quantity < 10)).map(p => p.title);
                            const outOfStockProducts = products.filter(p => p.variants?.every(v => v.inventory_quantity === 0)).map(p => p.title);

                            inventoryStats = {
                                totalProducts: products.length,
                                totalStockItems: totalStock,
                                lowStockCount: lowStockProducts.length,
                                outOfStockCount: outOfStockProducts.length,
                            };

                            const inventoryPrompt = this.buildInventoryPrompt(products.length, totalStock, lowStockProducts, outOfStockProducts, stats.topProducts);
                            inventorySummary = await this.generateAIContent(inventoryPrompt, userId);
                        }
                    } catch (err) {
                        console.error('Failed to fetch inventory data for report', err);
                    }

                    if (!inventorySummary) {
                        inventorySummary = await this.generateAIContent(this.buildWeeklyPrompt(statsSummary), userId);
                    }

                    reportData = {
                        content: inventorySummary,
                        stats: inventoryStats,
                        raw: stats,
                        generatedAt: new Date().toISOString(),
                    };
                    break;
                }

                case 'revenue': {
                    const prompt = this.buildRevenuePrompt(statsSummary);
                    aiContent = await this.generateAIContent(prompt, userId);
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue?.total || 0,
                            profitMargin: await this.calculateProfitMargin(shop, token, stats.revenue?.total || 0),
                            growth: stats.revenue?.change || 0,
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString(),
                    };
                    break;
                }

                case 'monthly': {
                    // Aggregate all previous weekly reports
                    const allReports = await this.getReports(userId);
                    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                    const recentWeeklyReports = allReports.filter(r =>
                        (r.type === 'weekly' || r.type === 'sales') &&
                        new Date(r.createdAt) > thirtyDaysAgo &&
                        r.status === 'ready'
                    );

                    let weeklyAggregation = '';
                    let totalRev = 0;

                    recentWeeklyReports.forEach((r, idx) => {
                        const rev = r.data?.stats?.totalRevenue || 0;
                        totalRev += rev;
                        weeklyAggregation += `\n--- Week ${idx + 1} Summary ---\n`;
                        weeklyAggregation += r.data?.content ? r.data.content.substring(0, 500) + '...' : `Revenue: $${rev}`;
                        weeklyAggregation += '\n';
                    });

                    const avgRev = recentWeeklyReports.length > 0 ? totalRev / recentWeeklyReports.length : 0;

                    const monthlyPrompt = this.buildMonthlyPrompt(weeklyAggregation, totalRev, avgRev, recentWeeklyReports.length, statsSummary);
                    aiContent = await this.generateAIContent(monthlyPrompt, userId);

                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: totalRev,
                            avgWeeklyRevenue: Math.round(avgRev),
                            weeksAnalyzed: recentWeeklyReports.length,
                            growth: stats.revenue?.change || 0,
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString(),
                    };
                    break;
                }

                case 'welcome': {
                    const prompt = this.buildWelcomePrompt(statsSummary, shop);
                    aiContent = await this.generateAIContent(prompt, userId);
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue?.total || 0,
                            productCount: stats.topProducts?.length || 0,
                            orderCount: stats.salesHistory?.length || 0,
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString(),
                    };
                    break;
                }

                case 'instant': {
                    const prompt = this.buildInstantReviewPrompt(statsSummary);
                    aiContent = await this.generateAIContent(prompt, userId);
                    reportData = {
                        content: aiContent,
                        stats: {
                            totalRevenue: stats.revenue?.total || 0,
                            profitMargin: await this.calculateProfitMargin(shop, token, stats.revenue?.total || 0),
                            productCount: stats.topProducts?.length || 0,
                            growth: stats.revenue?.change || 0,
                        },
                        raw: stats,
                        generatedAt: new Date().toISOString(),
                    };
                    break;
                }
            }

            // Generate DOCX
            const reports = this.loadReports();
            const idx = reports.findIndex(r => r.id === reportId);
            if (idx === -1) return;

            let docxBase64 = '';
            try {
                docxBase64 = await this.docxGeneratorService.generateDocx({
                    title: reports[idx].title,
                    type: reports[idx].type,
                    generatedAt: reportData.generatedAt || new Date().toISOString(),
                    content: reportData.content || '',
                    stats: reportData.stats,
                    shopName: shop,
                    userName: user?.name,
                });
            } catch (docxErr) {
                console.error('[Reports] DOCX generation failed:', docxErr.message);
            }

            // Update report
            reports[idx].status = 'ready';
            reports[idx].data = reportData;
            reports[idx].docxBase64 = docxBase64;
            this.saveReports(reports);

            // Send email based on report type
            const emailSent = await this.sendReportEmail(type, user, reports[idx], docxBase64);
            if (emailSent) {
                reports[idx].emailSent = true;
                this.saveReports(reports);
            }

            // Notify in-app
            await this.notificationsService.create(
                userId,
                'Analytics Ready',
                `Your ${type} analytics report ("${reports[idx].title}") is now complete and available for review in your dashboard.`,
                'success'
            );

        } catch (error) {
            console.error('Report generation failed:', error);
            const reports = this.loadReports();
            const idx = reports.findIndex(r => r.id === reportId);
            if (idx !== -1) {
                reports[idx].status = 'failed';
                this.saveReports(reports);

                await this.notificationsService.create(
                    userId,
                    'System Alert',
                    `An technical issue occurred while generating your report ("${reports[idx].title}"). Please attempt to regenerate it or contact support.`,
                    'error'
                );
            }
        }
    }

    private async sendReportEmail(type: string, user: any, report: Report, docxBase64: string): Promise<boolean> {
        if (!user?.email || !docxBase64) return false;

        try {
            let subject = '';
            let htmlContent = '';
            let attachmentName = '';
            let priority = 3;

            if (type === 'weekly' || type === 'sales') {
                subject = ` Your Weekly Store Report — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
                htmlContent = this.emailService.buildWeeklyEmailHtml(user.name || 'User', report.title, new Date().toLocaleDateString('en-US'));
                attachmentName = `StockBud_Weekly_Report_${new Date().toISOString().slice(0, 10)}.docx`;
                priority = 3;
            } else if (type === 'monthly') {
                subject = ` Your Monthly Business Review — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                htmlContent = this.emailService.buildMonthlyEmailHtml(user.name || 'User', report.title, new Date().toLocaleDateString('en-US'));
                attachmentName = `StockBud_Monthly_Review_${new Date().toISOString().slice(0, 7)}.docx`;
                priority = 2;
            } else if (type === 'welcome') {
                subject = ` Welcome to StockBud! Your First Store Analysis is Ready`;
                htmlContent = this.emailService.buildWelcomeEmailHtml(user.name || 'User', user.shopifyShop || 'Your Store');
                attachmentName = `StockBud_Welcome_Analysis_${(user.shopifyShop || 'Your Store').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
                priority = 1;
            } else if (type === 'instant') {
                subject = ` Your Instant System Review — ${report.title}`;
                htmlContent = this.emailService.buildInstantReviewEmailHtml(user.name || 'User', report.title);
                attachmentName = `StockBud_Instant_Review_${new Date().toISOString().slice(0, 10)}.docx`;
                priority = 1;
            } else {
                return false;
            }

            await this.emailBatchService.queueEmail({
                type: type as any,
                priority,
                options: {
                    to: [{ email: user.email, name: user.name || 'User' }],
                    subject,
                    htmlContent,
                }
            });

            return true;
        } catch (err) {
            console.error(`[Reports] Failed to send ${type} email:`, err.message);
            return false;
        }
    }

    @Cron('0 8 * * 1')
    async handleWeeklyReports() {
        const allUsers = await this.usersService.getAllUsers();
        for (const user of allUsers) {
            if (user.shopifyShop && user.shopifyToken) {
                try {
                    await this.generateReport(user.id, 'weekly');
                } catch (err) { }
            }
        }
    }

    @Cron('0 9 1 * *')
    async handleMonthlyReport() {
        const allUsers = await this.usersService.getAllUsers();
        for (const user of allUsers) {
            if (user.shopifyShop && user.shopifyToken) {
                try {
                    await this.generateReport(user.id, 'monthly');
                } catch (err) { }
            }
        }
    }

    async generateWelcomeReport(userId: string): Promise<void> {
        try {
            await this.generateReport(userId, 'welcome');
        } catch (err) { }
    }

    async generateInstantReview(userId: string): Promise<Report> {
        return this.generateReport(userId, 'instant');
    }

    async getReportById(userId: string, reportId: string): Promise<Report | null> {
        const reports = this.loadReports();
        return reports.find(r => r.id === reportId && r.userId === userId) || null;
    }

    async getReportDocx(userId: string, reportId: string): Promise<string | null> {
        const report = await this.getReportById(userId, reportId);
        return report?.docxBase64 || null;
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

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldReports() {
        const reports = this.loadReports();
        const users = await this.usersService.getAllUsers();
        const userRetention = new Map(users.map(u => [u.id, u.retentionMonths || 3]));
        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        const cleaned = reports.filter(report => {
            const retentionMonths = userRetention.get(report.userId) || 3;
            const retentionMs = retentionMonths * THIRTY_DAYS_MS;
            const reportAge = now - new Date(report.createdAt).getTime();
            if (reportAge > retentionMs) {
                deletedCount++;
                return false;
            }
            if (reportAge > 7 * 24 * 60 * 60 * 1000 && report.docxBase64) {
                report.docxBase64 = undefined;
            }
            return true;
        });

        if (deletedCount > 0) {
            this.saveReports(cleaned);
        }
    }

    private async generateAIContent(prompt: string, userId: string): Promise<string> {
        if (!this.geminiService.hasKeys()) {
            return "## AI Not Configured\n\nPlease configure the GEMINI_API_KEY to enable AI-generated reports.";
        }

        try {
            const result = await this.geminiService.executeWithRetry("gemini-1.5-flash", async (model) => {
                return await model.generateContent(prompt);
            });

            if (result.response.usageMetadata) {
                const { promptTokenCount, candidatesTokenCount, totalTokenCount } = result.response.usageMetadata;
                await this.usageService.logUsage({
                    userId: userId,
                    model: "gemini-1.5-flash",
                    inputTokens: promptTokenCount,
                    outputTokens: candidatesTokenCount,
                    totalTokens: totalTokenCount,
                    source: 'report'
                });

                // Prometheus metrics
                this.tokensCounter.inc({ type: 'input', source: 'report' }, promptTokenCount);
                this.tokensCounter.inc({ type: 'output', source: 'report' }, candidatesTokenCount);
            }

            return result.response.text();
        } catch (err) {
            return "## Report Generation Issue\n\nCould not generate the narrative report at this time.";
        }
    }

    private buildWeeklyPrompt(statsSummary: string): string {
        return `Analyze stats: ${statsSummary}. Generate Weekly report.`;
    }
    private buildInventoryPrompt(totalProducts: number, totalStock: number, lowStockProducts: string[], outOfStockProducts: string[], topProducts: any): string {
        return `Inventory check: ${totalProducts} products.`;
    }
    private buildRevenuePrompt(statsSummary: string): string {
        return `Revenue Analysis: ${statsSummary}`;
    }
    private buildMonthlyPrompt(weeklyAggregation: string, totalRev: number, avgRev: number, weekCount: number, currentStats: string): string {
        return `Monthly strategic review. Rev: ${totalRev}`;
    }
    private buildWelcomePrompt(statsSummary: string, shopName: string): string {
        return `Welcome report for ${shopName}`;
    }
    private buildInstantReviewPrompt(statsSummary: string): string {
        return `Instant Review: ${statsSummary}`;
    }

    private async calculateProfitMargin(shop: string, token: string, totalRevenue: number): Promise<number> {
        return totalRevenue * 0.3;
    }
}
