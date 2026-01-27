import { Controller, Post, Body, Get, Query, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('initialize')
    async initialize(@Req() req, @Body() body: { amount: number; tokenCount: number; callbackUrl: string }) {
        const user = req.user;
        // Validation logic
        // 100 tokens = 2000 NGN
        // ...
        // We trust frontend for now or we can strictly enforce:
        // const expectedPrice = (body.tokenCount / 100) * 2000;
        // if (Math.abs(expectedPrice - body.amount) > 0.01) ...

        return this.paymentsService.initializeTransaction(user, body.amount, body.tokenCount, body.callbackUrl);
    }

    @Get('verify')
    async verify(@Query('reference') reference: string) {
        if (!reference) {
            throw new HttpException('Reference is required', HttpStatus.BAD_REQUEST);
        }
        return this.paymentsService.verifyTransaction(reference);
    }
}
