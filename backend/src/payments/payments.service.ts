import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
    private readonly paystackSecretKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    }

    async initializeTransaction(user: any, amount: number, tokenCount: number, callbackUrl: string) {
        if (!this.paystackSecretKey) {
            throw new HttpException('Paystack is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Amount is passed in NGN (e.g. 2000).
        // Paystack expects amount in the smallest currency unit (kobo).
        // 2000 -> 200000 kobo.

        const amountInSubunits = Math.round(amount * 100);

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.paystack.co/transaction/initialize',
                    {
                        email: user.email,
                        amount: amountInSubunits,
                        callback_url: callbackUrl,
                        metadata: {
                            userId: user.id,
                            tokenCount: tokenCount,
                            custom_fields: [
                                {
                                    display_name: "Mobile Number",
                                    variable_name: "mobile_number",
                                    value: "+1234567890" // Optional, maybe needed for some gateways
                                }
                            ]
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.paystackSecretKey}`,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            return response.data.data; // { authorization_url, access_code, reference }
        } catch (error) {
            console.error('Paystack Initialize Error:', error.response?.data || error.message);
            throw new HttpException('Payment initialization failed', HttpStatus.BAD_REQUEST);
        }
    }

    async verifyTransaction(reference: string) {
        if (!this.paystackSecretKey) {
            throw new HttpException('Paystack is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `https://api.paystack.co/transaction/verify/${reference}`,
                    {
                        headers: {
                            Authorization: `Bearer ${this.paystackSecretKey}`,
                        },
                    },
                ),
            );

            const data = response.data.data;

            if (data.status === 'success') {
                const userId = data.metadata?.userId;
                const tokenCount = data.metadata?.tokenCount;

                if (userId) {
                    const type = data.metadata?.type;

                    if (type === 'store_slot') {
                        await this.usersService.increaseStoreLimit(userId);
                        return { success: true, message: 'Store limit increased successfully' };
                    } else if (type === 'retention_extend') {
                        const months = data.metadata?.months || 3;
                        await this.usersService.extendRetention(userId, Number(months));
                        return { success: true, message: `Data retention extended by ${months} months` };
                    } else if (type === 'report_payment') {
                        // Payment for report - no side effect here (logic is in controller or frontend just checks success), 
                        // or we could track it. For now just return success.
                        return { success: true, message: 'Report payment confirmed' };
                    } else if (tokenCount) {
                        // Legacy/Default: Token Topup
                        await this.usersService.topUpTokens(userId, Number(tokenCount));
                        return { success: true, message: 'Tokens added successfully', newBalance: await this.usersService.getAiTokens(userId) };
                    }
                }
            }

            return { success: false, message: 'Transaction not successful or invalid metadata' };

        } catch (error) {
            console.error('Paystack Verify Error:', error.response?.data || error.message);
            // If already verified, Paystack might return error? Or just status?
            // Usually it returns 200 even if verified before, but let's handle gracefully.
            throw new HttpException('Payment verification failed', HttpStatus.BAD_REQUEST);
        }
    }
}
