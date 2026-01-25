import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
    private products = [
        { id: 1, name: 'Premium Headphones', category: 'Electronics', price: 299.99, stock: 45, revenue: 24500, rating: 4.5, status: 'active', image: '🎧' },
        { id: 2, name: 'Wireless Mouse', category: 'Electronics', price: 49.99, stock: 120, revenue: 18400, rating: 4.3, status: 'active', image: '🖱️' },
        { id: 3, name: 'Office Chair', category: 'Furniture', price: 349.99, stock: 8, revenue: 31200, rating: 4.7, status: 'low', image: '💺' },
        { id: 4, name: 'Desk Lamp', category: 'Home', price: 39.99, stock: 0, revenue: 8900, rating: 4.0, status: 'out', image: '💡' },
        { id: 5, name: 'Notebook Set', category: 'Stationery', price: 24.99, stock: 200, revenue: 12400, rating: 4.2, status: 'active', image: '📓' },
        { id: 6, name: 'Coffee Mug', category: 'Home', price: 19.99, stock: 150, revenue: 9800, rating: 4.1, status: 'active', image: '☕' }
    ];

    findAll() {
        return {
            data: this.products,
            stats: {
                total: 156,
                active: 128,
                outOfStock: 12,
                lowStock: 16,
                totalRevenue: 125642.89,
                avgRating: 4.2
            }
        };
    }
}
