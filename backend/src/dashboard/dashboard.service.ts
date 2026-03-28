import { Injectable } from '@nestjs/common';
import { ShopifyService } from '../shopify/shopify.service';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DashboardService {
    private cachedRates: Record<string, { rates: any, timestamp: number }> = {};

    constructor(private readonly shopifyService: ShopifyService) { }

    async getStats(shop?: string, token?: string, targetType: 'weekly' | 'monthly' = 'monthly', targetValue: number = 0, targetCurrency: string = 'USD') {
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




                let exchangeRate = 1;
                if (orders.length > 0) {
                    const shopCurrency = orders[0].currency || 'USD';
                    if (shopCurrency !== targetCurrency) {
                        if (!this.cachedRates[shopCurrency] || Date.now() - this.cachedRates[shopCurrency].timestamp > 3600000) {
                            try {
                                const response = await axios.get(`https://open.er-api.com/v6/latest/${shopCurrency}`);
                                if (response.data && response.data.rates) {
                                    this.cachedRates[shopCurrency] = { rates: response.data.rates, timestamp: Date.now() };
                                }
                            } catch (e) {
                                console.error('Failed to fetch exchange rates', e.message);
                            }
                        }
                        exchangeRate = this.cachedRates[shopCurrency]?.rates[targetCurrency] || 1;
                    }
                }


                orders.forEach(order => {
                    const amount = Number(order.total_price) * exchangeRate;
                    if (order.financial_status === 'voided' || order.cancelled_at) {
                        lostRevenue += amount;
                    } else {
                        totalRevenue += amount;
                    }
                });


                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

                const thisWeekRevenue = orders
                    .filter(o => {
                        const date = new Date(o.created_at);
                        return date >= oneWeekAgo && !o.cancelled_at;
                    })
                    .reduce((sum, o) => sum + (Number(o.total_price) * exchangeRate), 0);

                const lastWeekRevenue = orders
                    .filter(o => {
                        const date = new Date(o.created_at);
                        return date >= twoWeeksAgo && date < oneWeekAgo && !o.cancelled_at;
                    })
                    .reduce((sum, o) => sum + (Number(o.total_price) * exchangeRate), 0);

                if (lastWeekRevenue > 0) {
                    revenueChange = Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);
                } else if (thisWeekRevenue > 0) {
                    revenueChange = 100;
                } else {
                    revenueChange = 0;
                }



                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().split('T')[0];
                });

                revenueData = last7Days.map(date => {
                    const dayRevenue = orders
                        .filter(o => o.created_at.startsWith(date) && !o.cancelled_at)
                        .reduce((sum, o) => sum + (Number(o.total_price) * exchangeRate), 0);

                    const dateObj = new Date(date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

                    const dailyTarget = targetType === 'monthly' ? targetValue / 30 : targetValue / 7;

                    return {
                        date: formattedDate,
                        revenue: dayRevenue,
                        target: Math.round(dailyTarget)
                    };
                });


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


                salesHistoryData = orders.slice(0, 5).map(o => {
                    const first = o.customer?.first_name || 'Guest';
                    const last = o.customer?.last_name || '';
                    const initials = (first[0] || '') + (last[0] || '');

                    return {
                        name: `${first} ${last}`.trim(),
                        amount: Math.round(Number(o.total_price) * exchangeRate),
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
            targetDetails: {
                type: targetType,
                value: targetValue
            },
            source: sourceData,
            heatmap: heatmapData,
            salesHistory: salesHistoryData,
            topProducts: topProducts
        };
    }

    private async getSocialOrders(userId: string): Promise<any[]> {
        const ordersPath = path.join(process.cwd(), 'orders.json');
        const dataOrdersPath = path.join(process.cwd(), 'data', 'orders.json');

        let orders = [];
        try {
            if (fs.existsSync(ordersPath)) {
                const content = fs.readFileSync(ordersPath, 'utf8');
                const data = JSON.parse(content);
                orders = Array.isArray(data) ? data : (data.orders || []);
            } else if (fs.existsSync(dataOrdersPath)) {
                const content = fs.readFileSync(dataOrdersPath, 'utf8');
                const data = JSON.parse(content);
                orders = Array.isArray(data) ? data : (data.orders || []);
            }
        } catch (e) {
            console.error('Failed to load social orders:', e.message);
        }

        return orders; // Filtering by userId might miss some orders if not properly linked
    }

    async getSocialStats(storeId: string, products: any[], userId: string) {
        let totalRevenue = 0;
        let potentialRevenue = 0;
        let heatmapData = [];
        let sourceData: { name: string; value: number; color: string }[] = [];
        let topProducts = [];

        // Calculate potential inventory value
        products.forEach(p => {
            potentialRevenue += (Number(p.price) || 0) * (Number(p.stock) || 0);
        });

        // 1. Get real orders for this store
        const allOrders = await this.getSocialOrders(userId);
        const storeOrders = allOrders.filter(o => o.storeId === storeId);

        // Calculate total revenue from orders
        storeOrders.forEach(order => {
            if (order.status !== 'cancelled') {
                totalRevenue += (Number(order.totalAmount) || 0);
            }
        });

        // 2. Generate 7-day chart data
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const revenueData = last7Days.map(date => {
            const dayRevenue = storeOrders
                .filter(o => o.createdAt && o.createdAt.startsWith(date) && o.status !== 'cancelled')
                .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

            // Mock target for now (e.g. 500 per day)
            const target = 500;

            return {
                date: formattedDate,
                revenue: dayRevenue,
                target: target
            };
        });

        // 3. Heatmap
        const heatMapCounts = {};
        storeOrders.forEach(o => {
            const date = o.createdAt?.split('T')[0];
            if (date) heatMapCounts[date] = (heatMapCounts[date] || 0) + 1;
        });

        heatmapData = Object.entries(heatMapCounts).map(([date, count]) => ({
            date,
            count: Number(count),
            level: Math.min(4, Math.ceil(Number(count) / 2))
        }));

        // 4. Source
        const mainSourceSource = products.length > 0 && products[0].type === 'instagram' ? 'Instagram' : 'WhatsApp';
        sourceData = [
            { name: mainSourceSource, value: 100, color: mainSourceSource === 'WhatsApp' ? '#10B981' : '#8B5CF6' }
        ];

        // 5. Top Products
        const productStats = {};
        storeOrders.forEach(o => {
            if (o.status !== 'cancelled' && o.items) {
                o.items.forEach(item => {
                    if (!productStats[item.productName]) {
                        productStats[item.productName] = { count: 0, revenue: 0 };
                    }
                    productStats[item.productName].count += (item.quantity || 1);
                    productStats[item.productName].revenue += (item.price * (item.quantity || 1));
                });
            }
        });

        topProducts = Object.entries(productStats)
            .map(([name, stats]: [string, any]) => ({ name, count: stats.count, revenue: stats.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Fallback to stock if no orders yet (show stock instead of revenue)
        if (topProducts.length === 0) {
            topProducts = [...products]
                .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
                .slice(0, 5)
                .map(p => ({ name: p.name, count: p.stock, revenue: 0 }));
        }

        return {
            revenue: {
                total: totalRevenue,
                potential: potentialRevenue,
                change: 0,
                chartData: revenueData,
                lost: 0
            },
            targetDetails: {
                type: 'monthly',
                value: 15000 // Mock target
            },
            source: sourceData,
            heatmap: heatmapData,
            salesHistory: storeOrders.slice(-5).reverse().map(o => ({
                name: o.customerName || 'Customer',
                amount: o.totalAmount,
                avatar: (o.customerName || 'C')[0].toUpperCase(),
                color: this.getRandomColor()
            })),
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
