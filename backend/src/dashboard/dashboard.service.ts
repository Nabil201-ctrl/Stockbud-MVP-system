import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
    getStats() {
        return {
            revenue: {
                total: 4025692.00,
                change: 2.94,
                period: "Current Week"
            },
            source: {
                direct: 45,
                social: 30,
                organic: 15,
                referral: 10
            },
            heatmap: [
                { date: '2025-01-01', level: 1 },
                { date: '2025-01-02', level: 3 },
                { date: '2025-01-03', level: 2 },
                { date: '2025-01-04', level: 4 }
            ],
            salesHistory: [
                { month: 'Jan', sales: 4000 },
                { month: 'Feb', sales: 3000 },
                { month: 'Mar', sales: 5000 },
                { month: 'Apr', sales: 4500 },
                { month: 'May', sales: 6000 },
                { month: 'Jun', sales: 5500 }
            ]
        };
    }
}
