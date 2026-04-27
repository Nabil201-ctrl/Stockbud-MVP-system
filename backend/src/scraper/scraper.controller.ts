import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { AddCredentialsDto } from './dto/add-credentials.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('scraper')
@UseGuards(JwtAuthGuard)
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) {}

    @Post('sites')
    async createSite(@Request() req, @Body() dto: CreateSiteDto) {
        return this.scraperService.createSite(req.user.id, dto);
    }

    @Get('sites')
    async getSites(@Request() req) {
        return this.scraperService.getUserSites(req.user.id);
    }

    @Get('sites/:id')
    async getSite(@Request() req, @Param('id') id: string) {
        return this.scraperService.getSiteDetails(req.user.id, id);
    }

    // This endpoint should ideally be protected by a Staff/Admin guard
    @Post('sites/:id/verify')
    async verifySite(@Param('id') id: string, @Body() dto: AddCredentialsDto) {
        return this.scraperService.verifySite(id, dto);
    }

    @Post('sites/:id/scrape')
    async triggerScrape(@Request() req, @Param('id') id: string) {
        return this.scraperService.triggerScrape(req.user.id, id);
    }

    @Delete('sites/:id')
    async deleteSite(@Request() req, @Param('id') id: string) {
        return this.scraperService.deleteSite(req.user.id, id);
    }
}
