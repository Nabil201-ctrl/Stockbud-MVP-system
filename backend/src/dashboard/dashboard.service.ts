import { Injectable } from '@nestjs/common';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class DashboardService {
    constructor(private readonly shopifyService: ShopifyService) { }

    async getStats(shop?: string, token?: string) {
        let totalRevenue = 0;
        let revenueChange = 0;
        let revenueData = [];
        let sourceData: { name: string; value: number; color: string }[] = [];
        let heatmapData = [];
        let salesHistoryData = [];
        let topProducts = [];
        let lostRevenue = 0;

        if (shop && token) {
            try {
                const ordersData = await this.shopifyService.getOrders(shop, token, { first: 50 });
                let orders: any[] = [];

                if (Array.isArray(ordersData)) {
                    orders = ordersData;
                } else {
                    orders = ordersData.orders;
                }
                // We're not using products for now as order line items differ from product objects
                // const products = await this.shopifyService.getProducts(shop, token); 

                // 1. Calculate Total Revenue & Lost Revenue
                orders.forEach(order => {
                    if (order.financial_status === 'voided' || order.cancelled_at) {
                        lostRevenue += Number(order.total_price);
                    } else {
                        totalRevenue += Number(order.total_price);
                    }
                });

                // 2. Revenue Change (This Week vs Last Week)
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

                const thisWeekRevenue = orders
                    .filter(o => {
                        const date = new Date(o.created_at);
                        return date >= oneWeekAgo && !o.cancelled_at;
                    })
                    .reduce((sum, o) => sum + Number(o.total_price), 0);

                const lastWeekRevenue = orders
                    .filter(o => {
                        const date = new Date(o.created_at);
                        return date >= twoWeeksAgo && date < oneWeekAgo && !o.cancelled_at;
                    })
                    .reduce((sum, o) => sum + Number(o.total_price), 0);

                if (lastWeekRevenue > 0) {
                    revenueChange = Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);
                } else if (thisWeekRevenue > 0) {
                    revenueChange = 100;
                } else {
                    revenueChange = 0;
                }


                // 3. Prepare Revenue Chart Data (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                });

                revenueData = last7Days.map(date => {
                    const dayRevenue = orders
                        .filter(o => o.created_at.startsWith(date) && !o.cancelled_at)
                        .reduce((sum, o) => sum + Number(o.total_price), 0);

                    const dateObj = new Date(date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

                    return {
                        date: formattedDate,
                        revenue: dayRevenue,
                        target: 0 // No mock target
                    };
                });

                // 4. Source Data
                const sources = {};
                orders.forEach(o => {
                    const source = o.source_name || 'direct';
                    sources[source] = (sources[source] || 0) + 1;
                });

                const totalOrders = orders.length || 1;
                sourceData = Object.entries(sources).map(([name, count]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value: Math.round((Number(count) / totalOrders) * 100),
                    color: this.getColorForSource(name)
                }));

                // 5. Heatmap Data
                const heatMapCounts = {};
                orders.forEach(o => {
                    const date = o.created_at.split('T')[0];
                    heatMapCounts[date] = (heatMapCounts[date] || 0) + 1;
                });

                heatmapData = Object.entries(heatMapCounts).map(([date, count]) => ({
                    date,
                    count: Number(count),
                    level: Math.min(4, Math.ceil(Number(count) / 2))
                }));

                // 6. Sales History
                salesHistoryData = orders.slice(0, 5).map(o => {
                    const first = o.customer?.first_name || 'Guest';
                    const last = o.customer?.last_name || '';
                    const initials = (first[0] || '') + (last[0] || '');

                    return {
                        name: `${first} ${last}`.trim(),
                        amount: Number(o.total_price),
                        avatar: initials.toUpperCase(),
                        color: this.getRandomColor()
                    };
                });

                // 7. Top Selling Products
                const productCounts = {};
                orders.forEach(o => {
                    if (!o.cancelled_at) {
                        o.line_items.forEach(item => {
                            productCounts[item.title] = (productCounts[item.title] || 0) + item.quantity;
                        });
                    }
                });

                topProducts = Object.entries(productCounts)
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .slice(0, 5)
                    .map(([name, count]) => ({ name, count }));

            } catch (error) {
                console.error("Failed to fetch shopify orders for stats:", error.message);
            }
        }

        return {
            revenue: {
                total: totalRevenue,
                change: revenueChange,
                chartData: revenueData,
                lost: lostRevenue
            },
            source: sourceData,
            heatmap: heatmapData,
            salesHistory: salesHistoryData,
            topProducts: topProducts
        };
    }

    private getColorForSource(source: string): string {
        switch (source.toLowerCase()) {
            case 'web': return '#3B82F6';
            case 'pos': return '#10B981';
            case 'instagram': return '#8B5CF6';
            case 'facebook': return '#F59E0B';
            default: return '#6B7280';
        }
    }

    private getRandomColor(): string {
        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}
