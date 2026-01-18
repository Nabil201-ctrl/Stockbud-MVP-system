import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { UsersService } from '../users/users.service';
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

    constructor(
        private readonly dashboardService: DashboardService,
        private readonly usersService: UsersService,
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

            switch (type) {
                case 'sales':
                    reportData = {
                        totalRevenue: stats.revenue.total,
                        revenueChange: stats.revenue.change,
                        chartData: stats.revenue.chartData,
                        salesHistory: stats.salesHistory,
                        topProducts: stats.topProducts,
                        generatedAt: new Date().toISOString()
                    };
                    break;
                case 'inventory':
                    reportData = {
                        topProducts: stats.topProducts,
                        sourceData: stats.source,
                        generatedAt: new Date().toISOString()
                    };
                    break;
                case 'revenue':
                    reportData = {
                        totalRevenue: stats.revenue.total,
                        lostRevenue: stats.revenue.lost,
                        revenueChange: stats.revenue.change,
                        chartData: stats.revenue.chartData,
                        heatmapData: stats.heatmap,
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
            }
        } catch (error) {
            console.error('Report generation failed:', error);
            const reports = this.loadReports();
            const idx = reports.findIndex(r => r.id === reportId);
            if (idx !== -1) {
                reports[idx].status = 'failed';
                this.saveReports(reports);
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
