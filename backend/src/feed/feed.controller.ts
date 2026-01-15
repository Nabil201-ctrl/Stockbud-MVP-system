import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedService } from './feed.service';
import { Feedback } from './feed.interface';

@Controller('feed')
export class FeedController {
    constructor(private readonly feedService: FeedService) { }

    @Post('feedback')
    // @UseGuards(AuthGuard('jwt'))
    async submitFeedback(@Req() req, @Body() body: { rating: number; category: string; message: string }) {
        const userId = req.user?.id || 'anonymous';
        const userName = req.user?.name || 'Anonymous User';

        return this.feedService.create({
            userId,
            userName,
            rating: body.rating,
            category: body.category,
            message: body.message,
        });
    }

    @Get('feedback')
    // @UseGuards(AuthGuard('jwt')) // Optional: restrict to admin later
    async getAllFeedback() {
        return this.feedService.findAll();
    }
}
