import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async getReports(@Req() req) {
        return this.reportsService.getReports(req.user.id);
    }

    @Get('stats')
    @UseGuards(AuthGuard('jwt'))
    async getQuickStats(@Req() req) {
        return this.reportsService.getQuickStats(req.user.id);
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async getReportById(@Req() req, @Param('id') id: string) {
        return this.reportsService.getReportById(req.user.id, id);
    }

    @Post('generate')
    @UseGuards(AuthGuard('jwt'))
    async generateReport(
        @Req() req,
        @Body() body: { type: 'sales' | 'inventory' | 'revenue' }
    ) {
        return this.reportsService.generateReport(req.user.id, body.type);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async deleteReport(@Req() req, @Param('id') id: string) {
        const deleted = await this.reportsService.deleteReport(req.user.id, id);
        return { success: deleted };
    }
}
