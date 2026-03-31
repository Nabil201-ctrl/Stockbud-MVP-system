import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsageService } from '../common/usage.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
    constructor(private readonly usageService: UsageService) { }

    @Get('usage')
    async getUsage() {
        return await this.usageService.getUsage();
    }

    @Get('usage/aggregate')
    async getAggregateUsage() {
        return await this.usageService.getAggregateUsage();
    }
}
