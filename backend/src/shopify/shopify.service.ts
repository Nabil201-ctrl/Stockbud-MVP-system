import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ConnectShopDto } from './dto/connect-shop.dto';
import { UsersService } from '../users/users.service';
import { ShopifyGateway } from './shopify.gateway';

@Injectable()
export class ShopifyService {
    // In-memory pairing code storage: code -> { userId, expiresAt }
    private pairingCodes = new Map<string, { userId: string; expiresAt: Date }>();

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly shopifyGateway: ShopifyGateway,
    ) { }

    /**
     * Generates a short-lived pairing code for a user.
     * Code expires in 10 minutes.
     */
    generatePairingCode(userId: string): string {
        // Generate a random code like "ABC-123-XYZ"
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const code = `${part1}-${part2}-${part3}`;

        // Store with 10-minute expiry
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        this.pairingCodes.set(code, { userId, expiresAt });

        console.log(`[Pairing] Generated code ${code} for user ${userId}, expires at ${expiresAt.toISOString()}`);
        return code;
    }

    /**
     * Validates a pairing code and returns the associated userId.
     * Consumes the code (one-time use).
     */
    validateAndConsumePairingCode(code: string): string | null {
        const entry = this.pairingCodes.get(code);
        if (!entry) {
            console.log(`[Pairing] Code ${code} not found`);
            return null;
        }

        if (new Date() > entry.expiresAt) {
            console.log(`[Pairing] Code ${code} expired`);
            this.pairingCodes.delete(code);
            return null;
        }

        // Consume the code
        this.pairingCodes.delete(code);
        console.log(`[Pairing] Code ${code} validated for user ${entry.userId}`);
        return entry.userId;
    }

    /**
     * Connects a Shopify store using a pairing code.
     */
    async connectWithCode(code: string, shop: string, accessToken: string) {
        const userId = this.validateAndConsumePairingCode(code);
        if (!userId) {
            return { success: false, error: 'Invalid or expired pairing code' };
        }

        // Use the existing connectShop logic with the resolved userId
        const dto = { shop, accessToken };
        return this.connectShop(dto as any, userId);
    }

    private async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async connectShop(dto: ConnectShopDto, userId?: string) {
        let user;

        if (userId) {
            user = await this.usersService.findById(userId);
        }

        // Fallback: Find user by shop or email (Legacy behavior or if userId lookup failed)
        if (!user) {
            const users = await this.usersService.getAllUsers();
            user = users.find(u => u.shopifyShop === dto.shop);

            if (!user && dto.email) {
                user = await this.usersService.findByEmail(dto.email);
            }
        }

        // --- Realtime Simulation Start ---
        // Step 1: Handshake (Already happening conceptually)
        this.shopifyGateway.emitStatusUpdate(dto.shop, 1, 'Initiating Handshake');
        await this.delay(1500);

        // Step 2: Verification
        this.shopifyGateway.emitStatusUpdate(dto.shop, 2, 'Verifying Credentials');
        await this.delay(2000);

        // Step 3: Syncing
        this.shopifyGateway.emitStatusUpdate(dto.shop, 3, 'Syncing Product Catalog');
        await this.delay(2500);

        // Step 4: Analyzing
        this.shopifyGateway.emitStatusUpdate(dto.shop, 4, 'Analyzing Historical Data');
        await this.delay(2000);
        // --- Realtime Simulation End ---

        if (user) {
            // Update existing
            await this.usersService.updateShopifyCredentials(user.id, dto.shop, dto.accessToken);

            // Update name if provided (from Shopify App Login)
            if (dto.name) {
                await this.usersService.updateProfile(user.id, { name: dto.name });
            }

            this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
            return { success: true, action: 'updated', userId: user.id };
        } else {
            // Only create new if we absolutely have to, but with JWT auth this branch should technically be unreachable if we require login
            // However, keeping fallback for robustness if logic changes
            const email = dto.email || `shop+${dto.shop}@stockbud.com`;
            const name = dto.shop.replace('.myshopify.com', '');
            const passwordHash = '$2b$10$NotARealPasswordHashForShopConnect' + Math.random();

            const newUser = await this.usersService.createUser(email, name, passwordHash);
            await this.usersService.updateShopifyCredentials(newUser.id, dto.shop, dto.accessToken);

            this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
            return { success: true, action: 'created', userId: newUser.id };
        }
    }

    async getOrders(shop: string, token: string) {
        if (!shop || !token) throw new HttpException('Missing Shopify credentials', HttpStatus.UNAUTHORIZED);

            const email = dto.email || `shop+${dto.shop}@stockbud.com`;
            const name = dto.shop.replace('
        const query = `
        {
          orders(first: 50, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                cancelledAt
                sourceName
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                lineItems(first: 10) {
                  edges {
                    node {
                      title
                      quantity
                    }
                  }
                }
              }
            }
          }
        }`;

        try {
            const url = `https://${shop}/admin/api/2024-01/graphql.json`;
            const response = await firstValueFrom(
                this.httpService.post(url, { query }, {
                    headers: {
                        'X-Shopify-Access-Token': token,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            if (response.data.errors) {
                console.error("GraphQL Errors:", JSON.stringify(response.data.errors));
                return [];
            }

            console.log("DEBUG: Shopify GraphQL Response:", JSON.stringify(response.data, null, 2));

            // Transform GraphQL structure to a flatter structure for the dashboard service
            // We map it to look somewhat like the old object, but without restricted fields
            return response.data.data.orders.edges.map(edge => {
                const node = edge.node;
                return {
                    id: node.id,
                    name: node.name,
                    created_at: node.createdAt,
                    cancelled_at: node.cancelledAt,
                    financial_status: typeof node.displayFinancialStatus === 'string' ? node.displayFinancialStatus.toLowerCase() : 'unknown',
                    total_price: node.totalPriceSet?.shopMoney?.amount || "0.00",
                    source_name: node.sourceName,
                    line_items: node.lineItems.edges.map(li => ({
                        title: li.node.title,
                        quantity: li.node.quantity
                    })),
                    // Mock customer to avoid errors in dashboard service
                    customer: {
                        first_name: "Guest",
                        last_name: "User"
                    }
                };
            });

        } catch (error) {
            console.error('Error fetching orders via GraphQL:', error.response?.data || error.message);
            return [];
        }
    }

    async getProducts(shop: string, token: string) {
        // Simplified product fetch if needed later
        return [];
    }
}
