import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { ShopifyService } from '../shopify/shopify.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../common/gemini.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { EmailBatchService } from '../email/email-batch.service';
import { DocxGeneratorService } from '../email/docx-generator.service';
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



    async generateReport(userId: string, type: 'sales' | 'inventory' | 'revenue' | 'weekly' | 'monthly' | 'welcome' | 'instant'): Promise<Report> {
        
        if (type === 'sales' || type === 'inventory' || type === 'revenue' || type === 'instant') {
            await this.usersService.deductReportToken(userId, 1);
        }

        const user = await this.usersService.findById(userId);
        const shop = user?.shopifyShop;
        const token = await this.usersService.getDecryptedShopifyToken(userId);

        const reportId = Math.random().toString(36).substr(2, 9);
        const titles = {
            sales: 'Weekly Sales Summary',
            inventory: 'Inventory Status Report',
            revenue: 'Monthly Revenue Analysis',
            weekly: `Weekly Performance Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            monthly: `Monthly Business Review — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            welcome: `Welcome Analysis — ${shop || 'Your Store'}`,
            instant: `Instant System Review — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        };
        const descriptions = {
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

        
        this.generateReportData(reportId, shop, token, type, userId);

        return report;
    }

    private async generateReportData(reportId: string, shop: string, token: string, type: string, userId: string) {
        try {
            const user = await this.usersService.findById(userId);
            const stats = await this.dashboardService.getStats(shop, token);

            let reportData: any = {};
            let aiContent = "";

            const statsSummary = JSON.stringify(stats, null, 2);

            switch (type) {
                case 'weekly':
                case 'sales': {
                    const prompt = this.buildWeeklyPrompt(statsSummary);
                    aiContent = await this.generateAIContent(prompt);
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
                            inventorySummary = await this.generateAIContent(inventoryPrompt);
                        }
                    } catch (err) {
                        console.error('Failed to fetch inventory data for report', err);
                    }

                    if (!inventorySummary) {
                        inventorySummary = await this.generateAIContent(this.buildWeeklyPrompt(statsSummary));
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
                    aiContent = await this.generateAIContent(prompt);
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
                    aiContent = await this.generateAIContent(monthlyPrompt);

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
                    aiContent = await this.generateAIContent(prompt);
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
                    aiContent = await this.generateAIContent(prompt);
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
                'Report Ready',
                `Your ${type} report "${reports[idx].title}" has been generated.${emailSent ? ' A copy was sent to your email.' : ''}`,
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
                    'Report Failed',
                    `Your ${type} report "${reports[idx].title}" failed to generate. Please try again.`,
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
                    attachment: {
                        name: attachmentName,
                        content: docxBase64,
                    },
                }
            });

            return true;
        } catch (err) {
            console.error(`[Reports] Failed to send ${type} email:`, err.message);
            return false;
        }
    }



    /**
     * Weekly Report Cron - Every Monday at 8:00 AM
     */
    @Cron('0 8 * * 1') // Monday 8 AM
    async handleWeeklyReports() {
        console.log('[Cron] Generating Weekly Reports for all connected users...');
        const allUsers = await this.usersService.getAllUsers();

        for (const user of allUsers) {
            if (user.shopifyShop && user.shopifyToken) {
                try {
                    console.log(`[Cron] Generating weekly report for user ${user.id} (${user.email})`);
                    await this.generateReport(user.id, 'weekly');
                } catch (err) {
                    console.error(`[Cron] Weekly report failed for user ${user.id}:`, err.message);
                }
            }
        }
    }

    /**
     * Monthly Review Cron - 1st of every month at 9:00 AM
     */
    @Cron('0 9 1 * *') // 1st of month at 9 AM
    async handleMonthlyReport() {
        console.log('[Cron] Generating Monthly Reviews for all connected users...');
        const allUsers = await this.usersService.getAllUsers();

        for (const user of allUsers) {
            if (user.shopifyShop && user.shopifyToken) {
                try {
                    console.log(`[Cron] Generating monthly review for user ${user.id} (${user.email})`);
                    await this.generateReport(user.id, 'monthly');
                } catch (err) {
                    console.error(`[Cron] Monthly report failed for user ${user.id}:`, err.message);
                }
            }
        }
    }

    /**
     * Generate a welcome report when user first connects their Shopify store
     */
    async generateWelcomeReport(userId: string): Promise<void> {
        console.log(`[Reports] Generating welcome report for user ${userId}`);
        try {
            await this.generateReport(userId, 'welcome');
        } catch (err) {
            console.error(`[Reports] Welcome report failed for user ${userId}:`, err.message);
        }
    }

    /**
     * Generate an instant paid review
     */
    async generateInstantReview(userId: string): Promise<Report> {
        console.log(`[Reports] Generating instant review for user ${userId}`);
        return this.generateReport(userId, 'instant');
    }



    async getReportById(userId: string, reportId: string): Promise<Report | null> {
        const reports = this.loadReports();
        return reports.find(r => r.id === reportId && r.userId === userId) || null;
    }

    async getReportDocx(userId: string, reportId: string): Promise<string | null> {
        const report = await this.getReportById(userId, reportId);
        if (!report || !report.docxBase64) return null;
        return report.docxBase64;
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
            totalRevenue: stats.revenue?.total || 0,
            revenueChange: stats.revenue?.change || 0,
            productCount: stats.topProducts?.length || 0,
            orderCount: stats.salesHistory?.length || 0,
            lostRevenue: stats.revenue?.lost || 0,
        };
    }



    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldReports() {
        console.log('Running daily report cleanup...');
        const reports = this.loadReports();
        const users = await this.usersService.getAllUsers();
        const userRetention = new Map(users.map(u => [u.id, u.retentionMonths || 3]));

        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        // Also strip docxBase64 from reports older than 7 days to save disk space
        const cleaned = reports.filter(report => {
            const retentionMonths = userRetention.get(report.userId) || 3;
            const retentionMs = retentionMonths * THIRTY_DAYS_MS;
            const reportAge = now - new Date(report.createdAt).getTime();

            if (reportAge > retentionMs) {
                deletedCount++;
                return false;
            }

            // Strip DOCX data from reports older than 7 days to save space
            if (reportAge > 7 * 24 * 60 * 60 * 1000 && report.docxBase64) {
                report.docxBase64 = undefined;
            }

            return true;
        });

        if (deletedCount > 0) {
            this.saveReports(cleaned);
            console.log(`[Cleanup] Deleted ${deletedCount} expired reports.`);
        }
    }



    private async generateAIContent(prompt: string): Promise<string> {
        if (!this.geminiService.hasKeys()) {
            return "## AI Not Configured\n\nPlease configure the GEMINI_API_KEY to enable AI-generated reports.";
        }

        try {
            const result = await this.geminiService.executeWithRetry("gemini-2.0-flash", async (model) => {
                return await model.generateContent(prompt);
            });
            return result.response.text();
        } catch (err) {
            console.error("AI Generation failed:", err.message);
            return "## Report Generation Issue\n\nCould not generate the narrative report at this time. Please review the raw data below.";
        }
    }

    private buildWeeklyPrompt(statsSummary: string): string {
        return `
You are a Senior Retail Data Strategist & Business Critic. Your role is NOT to just summarize data, but to critically analyze the shop's performance and find faults in their business strategy, operational efficiency, and revenue maximization.

Analyze the following sales data for an e-commerce store:
${statsSummary}

Generate a WEEKLY PERFORMANCE REPORT in Markdown format. BE DIRECT AND CRITICAL.

Structure:
1. **Executive Summary** — 2-3 sentences summarizing the week. Don't sugarcoat.
2. **Critical Performance Review** — What went WRONG or could be better? Call out specific metrics.
3. **Revenue Analysis** — Break down revenue performance: is it growing, stagnating, or declining?
4. **Missed Opportunities** — Identify:
   - Under-monetized products
   - Over-reliance on single products
   - Declining trends that need intervention
5. **Corrective Actions** — 3-5 specific, actionable recommendations

Use **bold** for emphasis. Be concise, strategic, and direct. Start directly with the content.`;
    }

    private buildInventoryPrompt(totalProducts: number, totalStock: number, lowStockProducts: string[], outOfStockProducts: string[], topProducts: any): string {
        return `
You are an Inventory Optimization Expert. Your goal is to identify "Dead Cash" (Overstock) and "Lost Revenue" (Out of Stock). Critically analyze this inventory data:
- Total Products: ${totalProducts}
- Total Stock Items: ${totalStock}
- LOW STOCK DANGER (${lowStockProducts.length}): ${lowStockProducts.join(', ') || 'None'}
- OUT OF STOCK FAILURES (${outOfStockProducts.length}): ${outOfStockProducts.join(', ') || 'None'}

Sales Context (Top Performers): ${JSON.stringify(topProducts)}

Structure:
1. **Inventory Health Check** — Grade the inventory health. Is it lean or bloated?
2. **Critical Faults** — Are top-selling items out of stock? Are there too many items with low stock risk?
3. **Action Plan** — What needs immediate reordering? What strategy needs to change?

Be strict about out-of-stock top sellers. That is a critical business failure.`;
    }

    private buildRevenuePrompt(statsSummary: string): string {
        return `
You are a Revenue Optimization Specialist. Analyze this e-commerce store's financial data:
${statsSummary}

Generate a REVENUE ANALYSIS in Markdown format. Be critical and data-driven.

Structure:
1. **Revenue Health** — Overall revenue trajectory
2. **Profit Margin Analysis** — Estimated margins and issues
3. **Revenue Leaks** — Where is money being lost?
4. **Growth Opportunities** — Specific strategies to increase revenue
5. **Strategic Recommendations** — 3-5 specific actions

Use **bold** for key findings. Start directly with the content.`;
    }

    private buildMonthlyPrompt(weeklyAggregation: string, totalRev: number, avgRev: number, weekCount: number, currentStats: string): string {
        return `
You are acting as a Fractional CFO conducting a MONTHLY STRATEGIC REVIEW. This is the most important report of the month.

You have access to:

## WEEKLY REPORT SUMMARIES FROM THE PAST MONTH
${weeklyAggregation || 'No weekly reports available.'}

## CURRENT STORE SNAPSHOT
${currentStats}

## FINANCIAL SUMMARY
- Total Monthly Revenue: $${totalRev}
- Average Weekly Revenue: $${avgRev.toFixed(0)}
- Weeks Analyzed: ${weekCount}

YOUR TASK: Generate a COMPREHENSIVE MONTHLY BUSINESS REVIEW in Markdown.

This should be significantly more detailed and strategic than a weekly report. Cover:

1. **Monthly Executive Summary** — The big picture. Were goals met? What's the trajectory?
2. **Trend Analysis** — Week-over-week trends. Is revenue volatile or stable? Why?
3. **Performance Scorecard** — Grade the business on Revenue (A-F), Inventory (A-F), Growth (A-F)
4. **Deep Dive: Revenue** — Monthly revenue breakdown, comparisons, projections
5. **Deep Dive: Inventory** — Stock health, dead stock identification, reorder recommendations
6. **Fault Report** — Every significant issue found across the month. Be brutally honest.
7. **Competitive Position** — Where does this store stand? What are competitors likely doing better?
8. **Strategic Roadmap for Next Month** — 5-7 specific, prioritized actions
9. **Risk Assessment** — What could go wrong next month? How to mitigate.

This is NOT a summary. This is a BOARD-LEVEL business review. Be thorough, critical, and strategic.
Use **bold** for key findings. Use headers for organization. Start directly with the content.`;
    }

    private buildWelcomePrompt(statsSummary: string, shopName: string): string {
        return `
You are a Senior Retail Consultant performing a FIRST-TIME STORE ASSESSMENT for a new client.

The store "${shopName}" has just been connected to StockBud for the first time. This is their welcome analysis.

Current Store Data:
${statsSummary}

Generate a WELCOME ANALYSIS REPORT in Markdown. Be insightful and constructive (but still critical where needed).

Structure:
1. **Welcome & First Impressions** — What does the data say about this store at first glance?
2. **Current State Assessment** — Revenue health, product catalog quality, inventory status
3. **Strengths Identified** — What's working well? (Be honest, don't fabricate)
4. **Immediate Concerns** — Red flags or areas that need urgent attention
5. **Quick Wins** — 3-5 things they can do THIS WEEK to improve
6. **What to Expect** — Explain that StockBud will send weekly reports and monthly reviews
7. **Baseline Metrics** — Establish the baseline numbers for future comparison

Be welcoming but professional. This sets the tone for the relationship. Start directly with the content.`;
    }

    private buildInstantReviewPrompt(statsSummary: string): string {
        return `
You are a Senior Business Analyst performing an ON-DEMAND COMPREHENSIVE SYSTEM REVIEW.

The store owner has PAID for this review. They expect maximum value, depth, and actionable insights.

Current Store Data:
${statsSummary}

Generate a COMPREHENSIVE SYSTEM REVIEW in Markdown. This should be your most detailed, valuable analysis.

Structure:
1. **Executive Overview** — Complete business health snapshot
2. **Revenue Deep Dive** — Detailed revenue analysis with projections
3. **Product Performance Matrix** — Every product analyzed: stars, cash cows, dogs, question marks
4. **Inventory Intelligence** — Stock optimization recommendations
5. **Customer Insights** — Order patterns, customer behavior analysis
6. **Competitive Audit** — Industry context and competitive positioning
7. **Growth Strategy** — Detailed 30/60/90 day growth plan
8. **Risk Register** — All identified risks with mitigation strategies
9. **Priority Action Matrix** — Urgent vs Important grid of recommended actions
10. **Key Metrics Dashboard** — The numbers that matter most going forward

This is a PREMIUM report. Make it worth paying for. Be exhaustive, analytical, and strategic.
Use **bold** for key findings. Use headers for clear organization. Start directly with the content.`;
    }



    private async calculateProfitMargin(shop: string, token: string, totalRevenue: number): Promise<number> {
        if (totalRevenue === 0) return 0;
        try {
            const productsData = await this.shopifyService.getProducts(shop, token, { first: 250 });
            const products = Array.isArray(productsData) ? productsData : productsData.products;
            let totalPotentialRevenue = 0;
            let totalPotentialCost = 0;

            products.forEach(product => {
                product.variants.forEach(variant => {
                    const price = parseFloat(variant.price);
                    const cost = parseFloat(variant.cost || '0');
                    const qty = variant.inventory_quantity > 0 ? variant.inventory_quantity : 1;

                    if (cost > 0) {
                        totalPotentialRevenue += price * qty;
                        totalPotentialCost += cost * qty;
                    }
                });
            });

            if (totalPotentialRevenue > 0) {
                const marginPercent = (totalPotentialRevenue - totalPotentialCost) / totalPotentialRevenue;
                return totalRevenue * marginPercent;
            }

            return totalRevenue * 0.3;
        } catch (error) {
            console.error('Error calculating profit margin:', error);
            return totalRevenue * 0.3;
        }
    }
}
