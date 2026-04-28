import { Controller, Get, Query, Req, Res, UseGuards, Post, Body } from '@nestjs/common';
import { MetaService } from './meta.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';



@Controller('meta')
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}


  @Get('auth/callback')
  async callback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    if (!code) {
      return res.redirect(`${frontendUrl}/settings?error=no_code`);
    }


    try {
      const tokenData = await this.metaService.exchangeCodeForToken(code);
      const accessToken = tokenData.access_token;

      // We need to know which user this is.
      // Usually, we pass a 'state' parameter in OAuth to link the session.
      // For the platform, we might just use the current logged-in user if we can.
      // But this is a redirect, so we lose the context unless we use cookies or state.
      
      // Let's assume the user is redirected back to the frontend with the token
      // or we handle it here and redirect with a success message.
      
      // To make it simple for the platform, we'll redirect back to frontend with the token
      // and let the frontend save it via a POST request.
      res.redirect(`${frontendUrl}/settings?meta_token=${accessToken}`);
    } catch (error) {
      res.redirect(`${frontendUrl}/settings?error=auth_failed`);
    }

  }

  @UseGuards(AuthGuard('jwt'))
  @Get('businesses')
  async getBusinesses(@Query('token') token: string) {
    return this.metaService.getBusinesses(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('catalogs')
  async getCatalogs(@Query('businessId') businessId: string, @Query('token') token: string) {
    return this.metaService.getCatalogs(businessId, token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('connect')
  async connectStore(@Req() req, @Body() body: any) {
    const userId = req.user.id;
    const { name, businessId, catalogId, accessToken } = body;

    const store = await this.prisma.socialStore.create({
      data: {
        name,
        type: 'meta',
        contact: businessId, // Using businessId as contact for now
        metaBusinessId: businessId,
        metaCatalogId: catalogId,
        accessToken,
        userId,
      },
    });

    // Trigger initial sync
    const syncedCount = await this.metaService.syncCatalogProducts(userId, store.id, catalogId, accessToken);

    return { store, syncedCount };
  }
}
