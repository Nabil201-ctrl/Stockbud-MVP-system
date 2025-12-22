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

        if (shop && token) {
            try {
                const orders = await this.shopifyService.getOrders(shop, token);

                // 1. Calculate Total Revenue & Change
                totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_price), 0);
                revenueChange = 0; // Needs historical comparison logic

                // 2. Prepare Revenue Chart Data (Last 7 Days)
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0]; // YYYY-MM-DD
                });

                revenueData = last7Days.map(date => {
                    const dayRevenue = orders
                        .filter(o => o.created_at.startsWith(date))
                        .reduce((sum, o) => sum + Number(o.total_price), 0);

                    const dateObj = new Date(date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

                    return {
                        date: formattedDate,
                        revenue: dayRevenue,
                        target: 0 // No mock target
                    };
                });

                // 3. Prepare Source Data
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

                // 4. Prepare Heatmap Data
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

                // 5. Prepare Sales History
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

            } catch (error) {
                console.error("Failed to fetch shopify orders for stats:", error.message);
            }
        }

        return {
            revenue: {
                total: totalRevenue,
                change: revenueChange,
                chartData: revenueData
            },
            source: sourceData,
            heatmap: heatmapData,
            salesHistory: salesHistoryData
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
