import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, SetMetadata } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { AddCredentialsDto } from './dto/add-credentials.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventPattern, Payload } from '@nestjs/microservices';

const Public = () => SetMetadata('isPublic', true);

@Controller('scraper')
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) { }

    @EventPattern('scrape_result')
    async handleScrapeResult(@Payload() data: any) {
        return this.scraperService.handleScrapeResult(data);
    }

    @UseGuards(JwtAuthGuard)
    @Post('sites')
    async createSite(@Request() req, @Body() dto: CreateSiteDto) {
        return this.scraperService.createSite(req.user.id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('sites')
    async getSites(@Request() req) {
        return this.scraperService.getUserSites(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('sites/:id')
    async getSite(@Request() req, @Param('id') id: string) {
        return this.scraperService.getSiteDetails(req.user.id, id);
    }

    // This endpoint is used by staff via a secure email link.
    @Get('verify/:id')
    async getSiteForVerification(@Param('id') id: string) {
        return this.scraperService.getSiteById(id);
    }

    // Temporarily public for debugging
    @Post('verify/:id')
    async verifySite(@Param('id') id: string, @Body() dto: AddCredentialsDto) {
        console.log(`[ScraperController] Received verification request for site ID: ${id}`);
        return this.scraperService.verifySite(id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('sites/:id/scrape')
    async triggerScrape(@Request() req, @Param('id') id: string) {
        return this.scraperService.triggerScrape(req.user.id, id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('sites/:id')
    async updateSite(@Request() req, @Param('id') id: string, @Body() dto: Partial<CreateSiteDto>) {
        return this.scraperService.updateSite(req.user.id, id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('sites/:id')
    async deleteSite(@Request() req, @Param('id') id: string) {
        return this.scraperService.deleteSite(req.user.id, id);
    }

    // DEBUG ONLY
    @Get('debug/all-sites')
    async getAllSites() {
        return this.scraperService.debugGetAllSites();
    }
}
