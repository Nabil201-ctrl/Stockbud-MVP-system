import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super();
    }

    async onModuleInit() {
        await this.$connect();
    }


    async onModuleDestroy() {
        await this.$disconnect();
    }

    // --- Backward Compatible Helper Methods ---

    async findUserByEmail(email: string) {
        return this.user.findUnique({
            where: { email },
            include: { shopifyStores: true, socialStores: true }
        });
    }

    async findUserById(id: string) {
        return this.user.findUnique({
            where: { id },
            include: { shopifyStores: true, socialStores: true }
        });
    }

    async createUser(data: any) {
        if (!data.id) delete data.id; // Let DB generate uuid
        return this.user.create({
            data,
            include: { shopifyStores: true, socialStores: true }
        });
    }

    async updateUser(id: string, data: any) {
        // handle increment/decrement logic dynamically
        const parsedData: any = {};
        for (const [k, v] of Object.entries(data)) {
            if (k === 'id' || k === 'shopifyStores' || k === 'socialStores') continue;
            if (typeof v === 'object' && v !== null && 'increment' in v) {
                parsedData[k] = { increment: (v as any).increment };
            } else if (typeof v === 'object' && v !== null && 'decrement' in v) {
                parsedData[k] = { decrement: (v as any).decrement };
            } else {
                parsedData[k] = v;
            }
        }

        return this.user.update({
            where: { id },
            data: parsedData,
            include: { shopifyStores: true, socialStores: true }
        });
    }

    async updateManyUsers(data: any) {
        const result = await this.user.updateMany({ data });
        return result.count;
    }

    async getAllUsers() {
        return this.user.findMany({
            include: { shopifyStores: true, socialStores: true }
        });
    }

    async findStoreById(storeId: string) {
        return this.shopifyStore.findUnique({ where: { id: storeId } });
    }

    async createStore(userId: string, data: any) {
        return this.shopifyStore.create({
            data: { ...data, userId }
        });
    }

    async updateStore(storeId: string, data: any) {
        return this.shopifyStore.update({
            where: { id: storeId },
            data
        });
    }

    async deleteStore(storeId: string) {
        await this.shopifyStore.delete({ where: { id: storeId } });
    }

    async deleteStoresByUserId(userId: string) {
        await this.shopifyStore.deleteMany({ where: { userId } });
        await this.socialStore.deleteMany({ where: { userId } });
    }

    async createSocialStore(userId: string, data: any) {
        return this.socialStore.create({
            data: { ...data, userId }
        });
    }

    async findSocialStoreById(storeId: string) {
        return this.socialStore.findUnique({ where: { id: storeId } });
    }

    async updateSocialStore(storeId: string, data: any) {
        return this.socialStore.update({
            where: { id: storeId },
            data
        });
    }

    async deleteSocialStore(storeId: string) {
        await this.socialStore.delete({ where: { id: storeId } });
    }

    async getOrdersByUserId(userId: string) {
        return this.order.findMany({ where: { userId } });
    }

    async createOrder(order: any) {
        return this.order.create({ data: order });
    }
}
