import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        DashboardModule,
        ProductsModule,
        UsersModule,
    ],
})
export class AppModule { }
