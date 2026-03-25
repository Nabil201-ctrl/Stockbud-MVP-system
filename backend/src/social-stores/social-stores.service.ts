import { Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes, randomUUID } from 'crypto';

export interface SocialStore {
    id: string;
    userId: string;
    type: string;
    storeName: string;
    contact: string;
    description: string | null;
    logo: string | null;
    createdAt: string;
}

export interface SocialProduct {
    id: string;
    storeId: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    image: string | null;
    slug: string;
    status: string;
    stock: number;
    createdAt: string;
}

interface StoreData {
    stores: SocialStore[];
    products: SocialProduct[];
}

@Injectable()
export class SocialStoresService implements OnModuleInit {
    private readonly dataPath = path.join(process.cwd(), 'data', 'social-stores.json');
    private data: StoreData = { stores: [], products: [] };

    async onModuleInit() {
        await this.loadData();
    }

    private async loadData() {
        try {
            const dir = path.dirname(this.dataPath);
            try {
                await fs.access(dir);
            } catch {
                await fs.mkdir(dir, { recursive: true });
            }

            try {
                const fileContent = await fs.readFile(this.dataPath, 'utf-8');
                this.data = JSON.parse(fileContent);
            } catch {
                await this.saveData();
            }
        } catch (error) {
            console.error('Failed to load social stores data:', error);
        }
    }

    private async saveData() {
        try {
            await fs.writeFile(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to save social stores data:', error);
        }
    }

    private generateId(): string {
        return randomUUID();
    }

    private generateSlug(): string {
        return randomBytes(6).toString('hex');
    }

    async createStore(userId: string, data: { type: string; storeName: string; contact: string; description?: string; logo?: string }) {
        const store: SocialStore = {
            id: this.generateId(),
            userId,
            type: data.type,
            storeName: data.storeName,
            contact: data.contact,
            description: data.description || null,
            logo: data.logo || null,
            createdAt: new Date().toISOString(),
        };
        this.data.stores.push(store);
        await this.saveData();
        return store;
    }

    async getStores(userId: string) {
        const userStores = this.data.stores.filter(s => s.userId === userId);
        return userStores.map(store => ({
            ...store,
            products: this.data.products.filter(p => p.storeId === store.id)
        })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getStoreById(storeId: string, userId: string) {
        const store = this.data.stores.find(s => s.id === storeId);
        if (!store) throw new NotFoundException('Store not found');
        if (store.userId !== userId) throw new ForbiddenException('Access denied');

        return {
            ...store,
            products: this.data.products.filter(p => p.storeId === store.id)
        };
    }

    async deleteStore(storeId: string, userId: string) {
        const storeIndex = this.data.stores.findIndex(s => s.id === storeId);
        if (storeIndex === -1) throw new NotFoundException('Store not found');
        if (this.data.stores[storeIndex].userId !== userId) throw new ForbiddenException('Access denied');

        const store = this.data.stores[storeIndex];
        this.data.stores.splice(storeIndex, 1);
        this.data.products = this.data.products.filter(p => p.storeId !== storeId);

        await this.saveData();
        return store;
    }

    async createProduct(userId: string, storeId: string, data: { name: string; description?: string; price: number; currency?: string; image?: string; stock?: number }) {
        const store = this.data.stores.find(s => s.id === storeId);
        if (!store) throw new NotFoundException('Store not found');
        if (store.userId !== userId) throw new ForbiddenException('Access denied');

        const product: SocialProduct = {
            id: this.generateId(),
            storeId,
            name: data.name,
            description: data.description || null,
            price: data.price,
            currency: data.currency || 'NGN',
            image: data.image || null,
            slug: this.generateSlug(),
            status: 'active',
            stock: data.stock || 0,
            createdAt: new Date().toISOString(),
        };

        this.data.products.push(product);
        await this.saveData();
        return product;
    }

    async getProducts(storeId: string, userId: string) {
        const store = this.data.stores.find(s => s.id === storeId);
        if (!store) throw new NotFoundException('Store not found');
        if (store.userId !== userId) throw new ForbiddenException('Access denied');

        return this.data.products
            .filter(p => p.storeId === storeId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async updateProduct(productId: string, userId: string, data: Partial<SocialProduct>) {
        const productIndex = this.data.products.findIndex(p => p.id === productId);
        if (productIndex === -1) throw new NotFoundException('Product not found');

        const product = this.data.products[productIndex];
        const store = this.data.stores.find(s => s.id === product.storeId);
        if (!store || store.userId !== userId) throw new ForbiddenException('Access denied');

        const updatedProduct = {
            ...product,
            ...(data.name !== undefined && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.price !== undefined && { price: data.price }),
            ...(data.currency !== undefined && { currency: data.currency }),
            ...(data.image !== undefined && { image: data.image }),
            ...(data.stock !== undefined && { stock: data.stock }),
            ...(data.status !== undefined && { status: data.status }),
        };

        this.data.products[productIndex] = updatedProduct;
        await this.saveData();
        return updatedProduct;
    }

    async deleteProduct(productId: string, userId: string) {
        const productIndex = this.data.products.findIndex(p => p.id === productId);
        if (productIndex === -1) throw new NotFoundException('Product not found');

        const product = this.data.products[productIndex];
        const store = this.data.stores.find(s => s.id === product.storeId);
        if (!store || store.userId !== userId) throw new ForbiddenException('Access denied');

        this.data.products.splice(productIndex, 1);
        await this.saveData();
        return product;
    }

    async getPublicProduct(slug: string) {
        const product = this.data.products.find(p => p.slug === slug);
        if (!product || product.status !== 'active') throw new NotFoundException('Product not found');

        const store = this.data.stores.find(s => s.id === product.storeId);
        return {
            ...product,
            store
        };
    }

    async getPublicStore(storeId: string) {
        const store = this.data.stores.find(s => s.id === storeId);
        if (!store) throw new NotFoundException('Store not found');

        const products = this.data.products
            .filter(p => p.storeId === storeId && p.status === 'active')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return {
            ...store,
            products
        };
    }
}
