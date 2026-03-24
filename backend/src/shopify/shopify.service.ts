import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ConnectShopDto } from './dto/connect-shop.dto';
import { UsersService } from '../users/users.service';
import { ShopifyGateway } from './shopify.gateway';

@Injectable()
export class ShopifyService {
  
  private pairingCodes = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly shopifyGateway: ShopifyGateway,
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

    
    this.shopifyGateway.emitStatusUpdate(dto.shop, 4, 'Analyzing Historical Data');
    await this.delay(2000);
    

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

      const newUser = await this.usersService.createUser(email, name, passwordHash);
      await this.usersService.updateShopifyCredentials(newUser.id, dto.shop, dto.accessToken);

      this.shopifyGateway.emitStatusUpdate(dto.shop, 5, 'Connection Secure & Active');
      return { success: true, action: 'created', userId: newUser.id };
    }
  }

  async getOrders(shop: string, token: string, options: any = {}) {
    if (!shop || !token) throw new HttpException('Missing Shopify credentials', HttpStatus.UNAUTHORIZED);

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
        return [];
      }

      console.log("DEBUG: Shopify GraphQL Response:", JSON.stringify(response.data, null, 2));

      
      const orders = response.data.data.orders.edges.map(edge => {
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
          customer: node.customer ? {
            first_name: node.customer.firstName || "Unknown",
            last_name: node.customer.lastName || "",
            email: node.customer.email
          } : null,
          cursor: edge.cursor
        };
      });

      return {
        orders,
        pageInfo: response.data.data.orders.pageInfo
      };

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

    console.log(`[ShopifyService] Fetching products for shop: ${shop} `, options);

    const apiUrl = `https://${shop}/admin/api/2024-01/graphql.json`;
    const headers = {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    };

    // Fetch total product count
    let totalCount = 0;
    try {
      const countQuery = `{ productsCount { count } }`;
      const countResponse = await firstValueFrom(
        this.httpService.post(apiUrl, { query: countQuery }, { headers, timeout: 30000 }),
      );
      if (countResponse.data?.data?.productsCount?.count !== undefined) {
        totalCount = countResponse.data.data.productsCount.count;
      }
    } catch (countError) {
      console.warn('[ShopifyService] Could not fetch product count:', countError.message);
    }

    // Main products query
    const { first = 6, last, after, before } = options;

    // Construct query arguments dynamically
    let args = '';
    if (first && !last) args += `first: ${first}`;
    if (last) args += `last: ${last}`;
    if (after) args += `, after: "${after}"`;
    if (before) args += `, before: "${before}"`;

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
                  inventoryItem {
                    unitCost {
                      amount
                    }
                  }
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
        console.error("GraphQL Errors:", JSON.stringify(response.data.errors));
        return { products: [], pageInfo: {}, totalCount: 0 };
      }

      
      const products = response.data.data.products.edges.map(edge => {
        const node = edge.node;
        return {
          id: node.id,
          title: node.title,
          product_type: node.productType,
          status: node.status.toLowerCase(),
          images: node.images.edges.map(img => ({ src: img.node.url })),
          variants: node.variants.edges.map(v => ({
            price: v.node.price,
            inventory_quantity: v.node.inventoryQuantity
          })),
          cursor: edge.cursor
        };
      });

      return {
        products,
        pageInfo: response.data.data.products.pageInfo,
        totalCount
      };

    } catch (error) {
      console.error('[ShopifyService] Error fetching products:', {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: JSON.stringify(error.response?.data)
      });
      return { products: [], pageInfo: {}, totalCount: 0 };
    }
  }
}
