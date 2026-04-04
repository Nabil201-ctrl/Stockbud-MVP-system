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

    // --- Chat Methods ---
    async getChatsByUserId(userId: string) {
        return this.chat.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    }

    async getChatById(id: string) {
        return this.chat.findUnique({ where: { id } });
    }

    async createChat(userId: string, data: any) {
        return this.chat.create({ data: { ...data, userId } });
    }

    async updateChat(id: string, data: any) {
        return this.chat.update({ where: { id }, data });
    }

    async deleteChat(id: string) {
        return this.chat.delete({ where: { id } });
    }

    // --- Notification Methods ---
    async getNotificationsByUserId(userId: string) {
        return this.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    }

    async createNotification(userId: string, data: any) {
        return this.notification.create({ data: { ...data, userId } });
    }

    async updateNotification(id: string, data: any) {
        return this.notification.update({ where: { id }, data });
    }

    async updateManyNotifications(userId: string, data: any) {
        return this.notification.updateMany({ where: { userId }, data });
    }

    // --- Feedback Methods ---
    async createFeedback(data: any) {
        return this.feedback.create({ data });
    }

    // --- Product Methods ---
    async upsertProduct(data: any) {
        if (data.externalId) {
            return this.product.upsert({
                where: { externalId: data.externalId },
                update: data,
                create: data
            });
        }
        return this.product.create({ data });
    }

    async getProductsByUserId(userId: string) {
        return this.product.findMany({ where: { userId } });
    }

    async getProductsByStoreId(storeId: string) {
        return this.product.findMany({
            where: {
                OR: [
                    { shopifyStoreId: storeId },
                    { socialStoreId: storeId }
                ]
            }
        });
    }

    // --- Sync Methods ---
    async createSyncHistory(data: any) {
        return this.syncHistory.create({ data });
    }

    async updateSyncHistory(id: string, data: any) {
        return this.syncHistory.update({ where: { id }, data });
    }

    // --- Trace Methods ---
    async logTrace(userId: string, action: string, entityType?: string, entityId?: string, metadata?: any) {
        return this.traceRecord.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                metadata
            }
        });
    }

    async getAllFeedback() {
        return this.feedback.findMany({ orderBy: { createdAt: 'desc' } });
    }


    // --- Custom Order Methods ---
    async upsertShopifyOrder(data: any) {
        if (data.shopifyOrderId) {
            return this.order.upsert({
                where: { shopifyOrderId: data.shopifyOrderId },
                update: data,
                create: data
            });
        }
        return this.order.create({ data });
    }
}


