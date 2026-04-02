import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsageService } from '../common/usage.service';
import { AdminGuard } from '../auth/guards/admin.guard';


@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
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
