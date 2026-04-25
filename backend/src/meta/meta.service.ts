import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async exchangeCodeForToken(code: string) {
    const clientId = this.configService.get('META_APP_ID');
    const clientSecret = this.configService.get('META_APP_SECRET');
    const redirectUri = this.configService.get('META_REDIRECT_URI');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/oauth/access_token`, {
          params: {
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to exchange code for token: ${error.message}`);
      throw error;
    }
  }

  async getBusinesses(accessToken: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/me/businesses`, {
          params: { access_token: accessToken },
        }),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch businesses: ${error.message}`);
      throw error;
    }
  }

  async getCatalogs(businessId: string, accessToken: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${businessId}/owned_product_catalogs`, {
          params: { access_token: accessToken },
        }),
      );
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch catalogs: ${error.message}`);
      throw error;
    }
  }

  async syncCatalogProducts(userId: string, storeId: string, catalogId: string, accessToken: string) {
    try {
      this.logger.log(`Syncing products for catalog: ${catalogId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${catalogId}/products`, {
          params: {
            access_token: accessToken,
            fields: 'id,name,description,image_url,price,currency,availability,condition,brand',
          },
        }),
      );

      const products = response.data.data;
      let totalSynced = 0;

      for (const p of products) {
        await this.prisma.upsertProduct({
          externalId: p.id,
          title: p.name,
          description: p.description,
          productType: 'Meta Product',
          status: p.availability === 'in stock' ? 'active' : 'archived',
          images: [{ src: p.image_url }],
          price: parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0,
          inventory: p.availability === 'in stock' ? 100 : 0, // Meta doesn't always provide exact quantity
          variants: [{
            price: p.price,
            inventory_quantity: p.availability === 'in stock' ? 100 : 0,
          }],
          source: 'meta',
          socialStoreId: storeId,
          userId: userId,
        });
        totalSynced++;
      }

      return totalSynced;
    } catch (error) {
      this.logger.error(`Failed to sync products: ${error.message}`);
      throw error;
    }
  }
}
