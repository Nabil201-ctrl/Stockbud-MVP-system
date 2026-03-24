import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { Response } from 'express';

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

        @Get(':id/download')
    @UseGuards(AuthGuard('jwt'))
    async downloadReport(@Req() req, @Param('id') id: string, @Res() res: Response) {
        const docxBase64 = await this.reportsService.getReportDocx(req.user.id, id);

        if (!docxBase64) {
            throw new HttpException('DOCX not available for this report. It may have expired or is still generating.', HttpStatus.NOT_FOUND);
        }

        const report = await this.reportsService.getReportById(req.user.id, id);
        const filename = `StockBud_${(report?.type || 'report').toUpperCase()}_${id}.docx`;

        const buffer = Buffer.from(docxBase64, 'base64');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length.toString());
        res.send(buffer);
    }

        @Post('generate')
    @UseGuards(AuthGuard('jwt'))
    async generateReport(
        @Req() req,
        @Body() body: { type: 'sales' | 'inventory' | 'revenue' }
    ) {
        return this.reportsService.generateReport(req.user.id, body.type);
    }

        @Post('instant-review')
    @UseGuards(AuthGuard('jwt'))
    async generateInstantReview(@Req() req) {
        return this.reportsService.generateInstantReview(req.user.id);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    async deleteReport(@Req() req, @Param('id') id: string) {
        const deleted = await this.reportsService.deleteReport(req.user.id, id);
        return { success: deleted };
    }
}
