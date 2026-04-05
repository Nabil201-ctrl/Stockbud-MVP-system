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

    async getStats(userId: string, shop?: string, token?: string, targetType: 'weekly' | 'monthly' = 'monthly', targetValue: number = 0, targetCurrency: string = 'USD', range: '7days' | 'month' | 'year' = 'month', sourceFilter?: string, sortBy: string = 'newest', activeShopId?: string) {
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
                const limit = range === 'year' ? 250 : (range === 'month' ? 100 : 50);
                const ordersData = await this.shopifyService.getOrders(shop, token, { first: limit });
                let shopifyOrders = Array.isArray(ordersData) ? ordersData : (ordersData as any).orders || [];

                shopifyOrders.forEach(o => {
                    mergedOrders.push({
                        ...o,
                        source: o.source_name || 'Shopify',
                        normalized_total: Number(o.total_price),
                        type: 'shopify',
                        created_at: o.created_at || o.createdAt
                    });
                });
            } catch (error) {
                console.error("Dashboard stats Shopify fetch error:", error.message);
            }
        }

        // 2. Fetch Local Orders
        const [orders, stores] = await Promise.all([
            activeShopId ? this.prisma.order.findMany({ where: { userId, storeId: activeShopId } }) : this.prisma.order.findMany({ where: { userId } }),
            this.prisma.socialStore.findMany({ where: { userId } })
        ]);

        orders.forEach(o => {
            const store = stores.find(s => s.id === o.storeId);
            mergedOrders.push({
                ...o,
                source: store?.name || o.source || 'Social Store',
                normalized_source: (store?.type || o.source || 'social').toLowerCase(),
                created_at: o.createdAt,
                normalized_total: Number(o.totalAmount) || 0,
                type: 'local'
            });
        });


        // 3. Filter by date and source
        let filteredOrders = mergedOrders.filter(o => new Date(o.created_at) >= filterDate);
        if (sourceFilter && sourceFilter !== 'all') {
            const normalizedFilter = sourceFilter.toLowerCase();
            filteredOrders = filteredOrders.filter(o => {
                const fSource = o.normalized_source || (o.source || '').toLowerCase();
                // If filter is 'web', match 'shopify' or 'web'
                if (normalizedFilter === 'web' || normalizedFilter === 'shopify') {
                    return fSource.includes('shopify') || fSource.includes('web');
                }
                // Match the filter against the source type
                return fSource.includes(normalizedFilter);
            });
        }

        // 4. Sorting
        if (sortBy === 'highest') {
            filteredOrders.sort((a, b) => b.normalized_total - a.normalized_total);
        } else if (sortBy === 'lowest') {
            filteredOrders.sort((a, b) => a.normalized_total - b.normalized_total);
        } else if (sortBy === 'oldest') {
            filteredOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else {
            // Default to newest
            filteredOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        // 5. Calculate Revenue
        filteredOrders.forEach(o => {
            if (o.cancelled_at) {
                lostRevenue += o.normalized_total;
            } else {
                totalRevenue += o.normalized_total;
            }
        });

        // 6. Weekly Revenue Change
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

        // 7. Chart Data (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        revenueData = last7Days.map(date => {
            const dayRevenue = filteredOrders
                .filter(o => {
                    const oDate = new Date(o.created_at).toISOString().split('T')[0];
                    return oDate === date && !o.cancelled_at;
                })
                .reduce((sum, o) => sum + o.normalized_total, 0);

            const dailyTarget = targetType === 'monthly' ? targetValue / 30 : targetValue / 7;

            return {
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
                revenue: dayRevenue,
                target: Math.round(dailyTarget)
            };
        });

        // 8. Sources breakdown
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

        // 9. Sales History (Already sorted)
        salesHistoryData = filteredOrders
            .slice(0, 10)
            .map(o => ({
                id: o.id,
                name: o.customerName || (o.customer ? `${o.customer.first_name} ${o.customer.last_name || ''}` : 'Customer'),
                amount: Math.round(o.normalized_total),
                avatar: (o.customerName?.[0] || (o.customer ? (o.customer.first_name?.[0] || 'C') : 'C')).toUpperCase(),
                color: this.getRandomColor(),
                date: o.created_at,
                source: o.source || 'Direct'
            }));

        // 10. Heatmap Data (Last 35 Days)
        const last35Days = [...Array(35)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (34 - i));
            return d.toISOString().split('T')[0];
        });

        heatmapData = last35Days.map(date => {
            const dayOrders = filteredOrders.filter(o => {
                const oDate = new Date(o.created_at).toISOString().split('T')[0];
                return oDate === date && !o.cancelled_at;
            });
            const revenue = dayOrders.reduce((sum, o) => sum + o.normalized_total, 0);

            let level = 0;
            if (revenue > 2000) level = 3;
            else if (revenue > 1000) level = 2;
            else if (revenue > 0) level = 1;

            return { date, level };
        });

        // 11. Top Products
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

        // 12. Potential Inventory Value (Inventory items * Price)
        const productsRaw = await this.prisma.product.findMany({
            where: { userId }
        });
        const currentInventoryValue = productsRaw.reduce((sum, p) => {
            const vars = Array.isArray(p.variants) ? (p.variants as any[]) : [];
            const price = parseFloat(vars[0] && typeof vars[0] === 'object' ? vars[0].price || '0' : '0');
            return sum + (price * (p.inventory || 0));
        }, 0);

        return {
            revenue: {
                total: totalRevenue,
                change: revenueChange,
                chartData: revenueData,
                lost: lostRevenue
            },
            inventoryValue: currentInventoryValue,
            targetDetails: {
                type: targetType,
                value: targetValue
            },
            source: sourceData,
            salesHistory: salesHistoryData,
            topProducts: topProducts,
            heatmap: heatmapData
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
