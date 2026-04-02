import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
    private products = [];

    findAll() {
        return {
            data: this.products,
            stats: {
                total: 0,
                active: 0,
                outOfStock: 0,
                lowStock: 0,
                totalRevenue: 0,
                avgRating: 0
            }
        };
    }
}
