import { Injectable } from '@nestjs/common';
import { ShopifyService } from '../shopify/shopify.service';
import { PrismaService } from '../database/prisma.service';
import axios from 'axios';

@Injectable()
export class DashboardService {
    private cachedRates: Record<string, { rates: any, timestamp: number }> = {};

    constructor(
        private readonly shopifyService: ShopifyService,
        private readonly prisma: PrismaService
    ) { }

    async getStats(userId: string, shop?: string, token?: string, targetType: 'weekly' | 'monthly' = 'monthly', targetValue: number = 0, targetCurrency: string = 'USD', range: '7days' | 'month' | 'year' = 'month', sourceFilter?: string) {
        let totalRevenue = 0;
        let revenueChange = 0;
        let revenueData = [];
        let sourceData: { name: string; value: number; color: string }[] = [];
        let heatmapData = [];
        let salesHistoryData = [];
        let topProducts = [];
        let lostRevenue = 0;

        const now = new Date();
        let filterDate = new Date();
        if (range === '7days') filterDate.setDate(now.getDate() - 7);
        else if (range === 'month') filterDate.setMonth(now.getMonth() - 1);
        else if (range === 'year') filterDate.setFullYear(now.getFullYear() - 1);

        let mergedOrders: any[] = [];

        // 1. Fetch Shopify Orders
        if (shop && token) {
            try {
                const limit = range === 'year' ? 150 : (range === 'month' ? 100 : 50);
                const ordersData = await this.shopifyService.getOrders(shop, token, { first: limit });
                let shopifyOrders = Array.isArray(ordersData) ? ordersData : (ordersData as any).orders || [];

                // Normalise Shopify orders to common format
                shopifyOrders.forEach(o => {
                    mergedOrders.push({
                        ...o,
                        source: o.source_name || 'Shopify',
                        normalized_total: Number(o.total_price),
                        type: 'shopify'
                    });
                });
            } catch (error) {
                console.error("Failed to fetch shopify orders for stats:", error.message);
            }
        }

        // 2. Fetch Local Social Store Orders
        const localOrders = await this.prisma.order.findMany({ where: { userId } });
        localOrders.forEach((o: any) => {
            mergedOrders.push({
                ...o,
                source: o.source || 'Social Store',
                created_at: o.createdAt || o.date,
                normalized_total: Number(o.totalAmount || o.total || 0),
                type: 'local'
            });
        });

        // 3. Filter by date and source
        let filteredOrders = mergedOrders.filter(o => new Date(o.created_at) >= filterDate);
        if (sourceFilter) {
            filteredOrders = filteredOrders.filter(o => o.source?.toLowerCase().includes(sourceFilter.toLowerCase()));
        }

        // 4. Calculate Revenue
        filteredOrders.forEach(o => {
            if (o.cancelled_at) {
                lostRevenue += o.normalized_total;
            } else {
                totalRevenue += o.normalized_total;
            }
        });

        // 5. Weekly Revenue Change
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeekRevenue = filteredOrders
            .filter(o => {
                const date = new Date(o.created_at);
                return date >= oneWeekAgo && !o.cancelled_at;
            })
            .reduce((sum, o) => sum + o.normalized_total, 0);

        const lastWeekRevenue = filteredOrders
            .filter(o => {
                const date = new Date(o.created_at);
                return date >= twoWeeksAgo && date < oneWeekAgo && !o.cancelled_at;
            })
            .reduce((sum, o) => sum + o.normalized_total, 0);

        if (lastWeekRevenue > 0) {
            revenueChange = Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);
        } else if (thisWeekRevenue > 0) {
            revenueChange = 100;
        }

        // 6. Chart Data
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        revenueData = last7Days.map(date => {
            const dayRevenue = filteredOrders
                .filter(o => o.created_at.startsWith(date) && !o.cancelled_at)
                .reduce((sum, o) => sum + o.normalized_total, 0);

            const dailyTarget = targetType === 'monthly' ? targetValue / 30 : targetValue / 7;

            return {
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
                revenue: dayRevenue,
                target: Math.round(dailyTarget)
            };
        });

        // 7. Sources breakdown
        const sources = {};
        filteredOrders.forEach(o => {
            const source = o.source || 'Direct';
            sources[source] = (sources[source] || 0) + 1;
        });

        const totalOrderCount = filteredOrders.length || 1;
        sourceData = Object.entries(sources).map(([name, count]) => ({
            name: name,
            value: Math.round((Number(count) / totalOrderCount) * 100),
            color: this.getColorForSource(name)
        }));

        // 8. Sales History
        salesHistoryData = filteredOrders
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map(o => ({
                name: o.customerName || (o.customer ? `${o.customer.first_name} ${o.customer.last_name || ''}` : 'Customer'),
                amount: Math.round(o.normalized_total),
                avatar: (o.customerName?.[0] || 'C').toUpperCase(),
                color: this.getRandomColor()
            }));

        // 9. Top Products
        const productCounts = {};
        filteredOrders.forEach(o => {
            if (!o.cancelled_at) {
                const items = o.line_items || o.items || [];
                items.forEach(item => {
                    const name = item.title || item.name || 'Product';
                    productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
                });
            }
        });

        topProducts = Object.entries(productCounts)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return {
            revenue: {
                total: totalRevenue,
                change: revenueChange,
                chartData: revenueData,
                lost: lostRevenue
            },
            targetDetails: {
                type: targetType,
                value: targetValue
            },
            source: sourceData,
            salesHistory: salesHistoryData,
            topProducts: topProducts
        };
    }

    private getColorForSource(source: string): string {
        switch (source.toLowerCase()) {
            case 'shopify': return '#3B82F6';
            case 'social store': return '#10B981';
            case 'whatsapp': return '#10B981';
            default: return '#6B7280';
        }
    }

    private getRandomColor(): string {
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}
