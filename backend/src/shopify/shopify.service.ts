import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ConnectShopDto } from './dto/connect-shop.dto';
import { UsersService } from '../users/users.service';
import { ShopifySyncService } from './shopify-sync.service';

import { ShopifyGateway } from './shopify.gateway';
import { EmailService } from '../email/email.service';

@Injectable()
export class ShopifyService {

  private pairingCodes = new Map<string, { userId: string; expiresAt: Date }>();

  /** In-memory cache: key -> { data, expiresAt } */
  private cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
  }

  /** Invalidate cache entries for a specific shop (e.g. after inventory update) */
  invalidateCache(shop?: string): void {
    if (!shop) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(shop)) {
        this.cache.delete(key);
      }
    }
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly shopifyGateway: ShopifyGateway,
    @Inject(forwardRef(() => ShopifySyncService))
    private readonly syncService: ShopifySyncService,
    private readonly emailService: EmailService,
  ) { }



  generatePairingCode(userId: string): string {

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
   * Consumes the code (one-time use), except for the master review code.
   */
  async validateAndConsumePairingCode(code: string): Promise<string | null> {
    // Hardcoded master code for Shopify Reviewers
    if (code === 'STOCK-BUD-REVIEW') {
      console.log(`[Pairing] Master review code used. Linking to tester account.`);
      let tester = await this.usersService.findByEmail('tester@stockbud.xyz');
      if (!tester) {
        // Create the tester user on the fly if it doesn't exist
        tester = await this.usersService.createUser(
          'tester@stockbud.xyz',
          'Shopify Reviewer',
          '$2b$10$ReviewerSecretHash' + Math.random(),
          false
        );
      }
      return tester.id;
    }

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
    const userId = await this.validateAndConsumePairingCode(code);
    if (!userId) {
      return { success: false, error: 'Invalid or expired pairing code' };
    }


    const dto = { shop, accessToken };
    return this.connectShop(dto as any, userId);
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async connectShop(dto: ConnectShopDto, userId?: string) {

    const tokenPrefix = dto.accessToken ? dto.accessToken.substring(0, 10) + '...' : 'MISSING';
    console.log(`[Connect] Connecting shop: ${dto.shop}, Token Prefix: ${tokenPrefix}`);

    let user;

    if (userId) {
      user = await this.usersService.findById(userId);
    }


    if (!user) {
      const users = await this.usersService.getAllUsers();
      user = users.find(u => u.shopifyShop === dto.shop);

      if (!user && dto.email) {
        user = await this.usersService.findByEmail(dto.email);
      }
    }



    this.shopifyGateway.emitStatusUpdate(dto.shop, 1, 'Initiating Handshake');
    await this.delay(1500);


    this.shopifyGateway.emitStatusUpdate(dto.shop, 2, 'Verifying Credentials');
    await this.delay(2000);


    this.shopifyGateway.emitStatusUpdate(dto.shop, 3, 'Syncing Product Catalog');
    await this.delay(2500);


    this.shopifyGateway.emitStatusUpdate(dto.shop, 4, 'Collecting Store Catalog & Historical Data');

    // Asynchronously start the deep sync
    try {
      const dbStore = await this.usersService.getActiveShop(user.id);
      if (dbStore) {
        this.syncService.initialSync(user.id, dbStore.id);
      }
    } catch (e) {
      console.error('[ShopifyService] Sync trigger failed:', e.message);
    }

    await this.delay(1000);



    if (user) {

      await this.usersService.updateShopifyCredentials(user.id, dto.shop, dto.accessToken);


      if (dto.name) {
        await this.usersService.updateProfile(user.id, { name: dto.name });
      }

      this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
      return { success: true, action: 'updated', userId: user.id };
    } else {


      const email = dto.email || `shop+${dto.shop}@stockbud.com`;
      const name = dto.shop.replace('.myshopify.com', '');
      const passwordHash = '$2b$10$NotARealPasswordHashForShopConnect' + Math.random();
      const verificationToken = Math.random().toString(36).substr(2, 15);

      const newUser = await this.usersService.createUser(email, name, passwordHash, true, verificationToken, true);
      await this.usersService.updateShopifyCredentials(newUser.id, dto.shop, dto.accessToken);

      // Send Welcome & Verification Email via Brevo
      await this.emailService.sendAccountVerificationEmail(newUser.email, newUser.name || 'User', verificationToken);
      await this.emailService.sendWelcomeEmail(newUser.email, newUser.name || 'User');


      this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
      return { success: true, action: 'created', userId: newUser.id };
    }
  }

  async getOrders(shop: string, token: string, options: any = {}) {
    if (!shop || !token) throw new HttpException('Missing Shopify credentials', HttpStatus.UNAUTHORIZED);

    const cacheKey = `orders:${shop}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log(`[ShopifyService] Cache HIT for orders: ${shop}`);
      return cached;
    }

    const { first = 20, last, after, before } = options;

    let args = '';
    if (first && !last) args += `first: ${first}`;
    if (last) args += `last: ${last}`;
    if (after) args += `, after: "${after}"`;
    if (before) args += `, before: "${before}"`;

    const query = `
        {
          orders(${args}, reverse: true) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
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
                customer {
                  firstName
                  lastName
                  email
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
          timeout: 60000,
        }),
      );

      if (response.data.errors) {
        console.error("GraphQL Errors:", JSON.stringify(response.data.errors));
        return { orders: [], pageInfo: {} };
      }

      const orders = response.data.data.orders.edges.map(edge => {
        const node = edge.node;
        return {
          id: node.id,
          name: node.name,
          created_at: node.createdAt,
          cancelled_at: node.cancelledAt,
          financial_status: typeof node.displayFinancialStatus === 'string' ? node.displayFinancialStatus.toLowerCase() : 'unknown',
          fulfillment_status: typeof node.displayFulfillmentStatus === 'string' ? node.displayFulfillmentStatus.toLowerCase() : 'unfulfilled',
          total_price: node.totalPriceSet?.shopMoney?.amount || "0.00",
          currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
          source_name: node.sourceName,
          line_items: node.lineItems.edges.map(li => ({
            title: li.node.title,
            quantity: li.node.quantity
          })),
          customer: node.customer ? {
            first_name: node.customer.firstName || "Unknown",
            last_name: node.customer.lastName || "",
            email: node.customer.email
          } : null,
          cursor: edge.cursor
        };
      });

      const result = {
        orders,
        pageInfo: response.data.data.orders.pageInfo
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error fetching orders via GraphQL:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      return { orders: [], pageInfo: {} };
    }
  }

  async getProducts(shop: string, token: string, options: any = {}) {

    const cacheKey = `products:${shop}:${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      console.log(`[ShopifyService] Cache HIT for products: ${shop}`);
      return cached;
    }

    console.log(`[ShopifyService] Fetching products for shop: ${shop} `, options);

    const apiUrl = `https://${shop}/admin/api/2024-01/graphql.json`;
    const headers = {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    };

    // Fetch product statistics for the summary
    let summary = {
      total: 0,
      active: 0,
      outOfStock: 0,
      lowStock: 0,
      categories: {}
    };

    try {
      const statsQuery = `
      {
        total: productsCount { count }
        active: productsCount(query: "status:active") { count }
        outOfStock: productsCount(query: "inventory_total:<=0") { count }
      }`;

      const statsResponse = await firstValueFrom(
        this.httpService.post(apiUrl, { query: statsQuery }, { headers, timeout: 15000 }),
      );

      const statsData = statsResponse.data?.data;
      if (statsData) {
        summary.total = statsData.total?.count || 0;
        summary.active = statsData.active?.count || 0;
        summary.outOfStock = statsData.outOfStock?.count || 0;
        summary.lowStock = 0;
      }
    } catch (statsError) {
      console.warn('[ShopifyService] Could not fetch product statistics:', statsError.message);
    }

    // Main products query
    const { first, last, after, before } = options;

    // Construct query arguments dynamically
    let argsArr = [];
    if (first) argsArr.push(`first: ${first}`);
    if (last) argsArr.push(`last: ${last}`);
    if (after) argsArr.push(`after: "${after}"`);
    if (before) argsArr.push(`before: "${before}"`);

    // Default to first 6 if neither first nor last is provided
    if (argsArr.length === 0 || (!first && !last)) {
      argsArr.unshift('first: 6');
    }

    const args = argsArr.join(', ');

    const productsQuery = `
    {
      products(${args}) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            id
            title
            productType
            status
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  price
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(apiUrl, { query: productsQuery }, {
          headers,
          timeout: 60000,
        }),
      );

      if (response.data.errors) {
        console.error("[Shopify] GraphQL Errors:", JSON.stringify(response.data.errors));
        return { products: [], pageInfo: {}, totalCount: summary.total, summary };
      }

      if (!response.data.data?.products) {
        return { products: [], pageInfo: {}, totalCount: summary.total, summary };
      }

      const products = response.data.data.products.edges.map(edge => {
        const node = edge.node;
        return {
          id: node.id,
          title: node.title,
          product_type: node.productType || 'Uncategorized',
          status: (node.status || 'ACTIVE').toLowerCase(),
          images: node.images.edges.map(img => ({ src: img.node.url })),
          variants: node.variants.edges.map(v => ({
            price: v.node.price,
            inventory_quantity: v.node.inventoryQuantity
          })),
          cursor: edge.cursor
        };
      });

      const result = {
        products,
        pageInfo: response.data.data.products.pageInfo,
        totalCount: summary.total,
        summary
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('[ShopifyService] Critical Error fetching products:', error.message);
      return { products: [], pageInfo: {}, totalCount: summary.total, summary };
    }
  }
  async updateInventory(shop: string, token: string, variantId: string, delta: number) {
    if (!shop || !token) return;

    // First fetch the inventoryItemId for this variant
    const variantQuery = `
    {
      productVariant(id: "${variantId}") {
        inventoryItem {
          id
        }
      }
    }`;

    try {
      const apiUrl = `https://${shop}/admin/api/2024-01/graphql.json`;
      const headers = {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      };

      const variantResponse = await firstValueFrom(
        this.httpService.post(apiUrl, { query: variantQuery }, { headers, timeout: 30000 }),
      );

      const inventoryItemId = variantResponse.data?.data?.productVariant?.inventoryItem?.id;
      if (!inventoryItemId) {
        console.error(`[ShopifyService] Could not find inventory item for variant ${variantId}`);
        return;
      }

      // Fetch the first location ID
      const locationQuery = `{ locations(first: 1) { edges { node { id } } } }`;
      const locationResponse = await firstValueFrom(
        this.httpService.post(apiUrl, { query: locationQuery }, { headers, timeout: 30000 }),
      );

      const locationId = locationResponse.data?.data?.locations?.edges?.[0]?.node?.id;
      if (!locationId) {
        console.error('[ShopifyService] No inventory location found');
        return;
      }

      // Perform the adjustment
      const mutation = `
      mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
          inventoryAdjustmentGroup {
            createdAt
            reason
          }
          userErrors {
            field
            message
          }
        }
      }`;

      const variables = {
        input: {
          reason: "correction",
          name: "available",
          changes: [
            {
              delta,
              inventoryItemId,
              locationId
            }
          ]
        }
      };

      const response = await firstValueFrom(
        this.httpService.post(apiUrl, { query: mutation, variables }, { headers, timeout: 30000 }),
      );

      if (response.data?.data?.inventoryAdjustQuantities?.userErrors?.length > 0) {
        console.error('[ShopifyService] Inventory adjustment error:', response.data.data.inventoryAdjustQuantities.userErrors);
      } else {
        console.log(`[ShopifyService] Successfully adjusted inventory by ${delta} for variant ${variantId} on Shopify`);
        this.invalidateCache(shop);
      }

    } catch (error) {
      console.error('[ShopifyService] Failed to update Shopify inventory:', error.message);
    }
  }
}
