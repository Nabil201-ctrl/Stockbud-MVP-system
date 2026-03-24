import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../users/users.service';
import * as fs from 'fs';
import * as path from 'path';

interface ProcessedPayment {
    reference: string;
    status: 'success' | 'failed' | 'processing';
    type: string;
    userId: string;
    result: any;
    processedAt: string;
    paystackStatus: string;
    amount: number;
}

@Injectable()
export class PaymentsService {
    private readonly paystackSecretKey: string;
    private readonly logger = new Logger(PaymentsService.name);
    private readonly paymentsFilePath: string;
    private processedPayments: Map<string, ProcessedPayment> = new Map();
    private processingLocks: Set<string> = new Set(); 

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        this.paymentsFilePath = path.join(process.cwd(), 'data', 'payments.json');
        this.loadPayments();
    }



    private loadPayments(): void {
        try {
            if (fs.existsSync(this.paymentsFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.paymentsFilePath, 'utf-8'));
                this.processedPayments = new Map(
                    (data.payments || []).map((p: ProcessedPayment) => [p.reference, p])
                );
                this.logger.log(`Loaded ${this.processedPayments.size} processed payments`);
            }
        } catch (error) {
            this.logger.warn('Could not load payments file, starting fresh:', error.message);
            this.processedPayments = new Map();
        }
    }

    private savePayments(): void {
        try {
            const dir = path.dirname(this.paymentsFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = {
                lastUpdated: new Date().toISOString(),
                payments: Array.from(this.processedPayments.values()),
            };
            fs.writeFileSync(this.paymentsFilePath, JSON.stringify(data, null, 2));
        } catch (error) {
            this.logger.error('Failed to save payments file:', error.message);
        }
    }



    async initializeTransaction(user: any, amount: number, tokenCount: number, callbackUrl: string) {
        if (!this.paystackSecretKey) {
            throw new HttpException('Paystack is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const amountInSubunits = Math.round(amount * 100);

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.paystack.co/transaction/initialize',
                    {
                        email: user.email,
                        amount: amountInSubunits,
                        currency: 'USD',
                        callback_url: callbackUrl,
                        metadata: {
                            userId: user.id,
                            tokenCount: tokenCount,
                            custom_fields: [
                                {
                                    display_name: "Mobile Number",
                                    variable_name: "mobile_number",
                                    value: "+1234567890"
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

            return response.data.data;
        } catch (error) {
            this.logger.error('Paystack Initialize Error:', error.response?.data || error.message);
            throw new HttpException('Payment initialization failed', HttpStatus.BAD_REQUEST);
        }
    }



    async verifyTransaction(reference: string) {
        if (!this.paystackSecretKey) {
            throw new HttpException('Paystack is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        
        const existing = this.processedPayments.get(reference);
        if (existing && existing.status === 'success') {
            this.logger.log(`[Idempotent] Payment ${reference} already processed. Returning cached result.`);
            return {
                ...existing.result,
                idempotent: true,
                message: existing.result.message + ' (already processed)',
            };
        }
        if (existing && existing.status === 'failed') {
            this.logger.log(`[Idempotent] Payment ${reference} previously failed. Allowing retry.`);
            
        }

        
        if (this.processingLocks.has(reference)) {
            this.logger.warn(`[Idempotent] Payment ${reference} is currently being processed. Waiting...`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            const result = this.processedPayments.get(reference);
            if (result && result.status === 'success') {
                return { ...result.result, idempotent: true };
            }
            return { success: false, message: 'Payment is still being processed. Please try again shortly.' };
        }

        
        this.processingLocks.add(reference);

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
                const type = data.metadata?.type || (tokenCount ? 'token_topup' : 'unknown');

                if (!userId) {
                    const failResult = { success: false, message: 'Missing userId in payment metadata' };
                    this.recordPayment(reference, 'failed', type, '', failResult, data.status, data.amount || 0);
                    return failResult;
                }

                let result: any;

                try {
                    if (type === 'store_slot') {
                        await this.usersService.increaseStoreLimit(userId);
                        result = { success: true, message: 'Store limit increased successfully' };
                    } else if (type === 'retention_extend') {
                        const months = data.metadata?.months || 3;
                        await this.usersService.extendRetention(userId, Number(months));
                        result = { success: true, message: `Data retention extended by ${months} months` };
                    } else if (type === 'report_payment') {
                        result = { success: true, message: 'Report payment confirmed' };
                    } else if (tokenCount) {
                        await this.usersService.topUpTokens(userId, Number(tokenCount));
                        const newBalance = await this.usersService.getAiTokens(userId);
                        result = { success: true, message: 'Tokens added successfully', newBalance };
                    } else {
                        result = { success: true, message: 'Payment verified (no action required)' };
                    }

                    
                    this.recordPayment(reference, 'success', type, userId, result, data.status, data.amount || 0);
                    this.logger.log(`[Payment] Successfully processed ${reference} (type: ${type}) for user ${userId}`);
                    return result;

                } catch (sideEffectError) {
                    
                    this.logger.error(`[Payment] Side effect failed for ${reference}:`, sideEffectError.message);
                    const failResult = { success: false, message: `Payment verified but action failed: ${sideEffectError.message}` };
                    this.recordPayment(reference, 'failed', type, userId, failResult, data.status, data.amount || 0);
                    throw new HttpException(failResult.message, HttpStatus.INTERNAL_SERVER_ERROR);
                }
            }

            
            const failResult = { success: false, message: `Transaction status: ${data.status}` };
            this.recordPayment(reference, 'failed', 'unknown', data.metadata?.userId || '', failResult, data.status, data.amount || 0);
            return failResult;

        } catch (error) {
            if (error instanceof HttpException) throw error;
            this.logger.error('Paystack Verify Error:', error.response?.data || error.message);
            throw new HttpException('Payment verification failed. Please retry.', HttpStatus.BAD_REQUEST);
        } finally {
            // 6. Release lock
            this.processingLocks.delete(reference);
        }
    }



    private recordPayment(
        reference: string,
        status: 'success' | 'failed' | 'processing',
        type: string,
        userId: string,
        result: any,
        paystackStatus: string,
        amount: number,
    ): void {
        this.processedPayments.set(reference, {
            reference,
            status,
            type,
            userId,
            result,
            processedAt: new Date().toISOString(),
            paystackStatus,
            amount,
        });
        this.savePayments();
    }



    getPaymentHistory(): ProcessedPayment[] {
        return Array.from(this.processedPayments.values())
            .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
    }

    getPaymentByReference(reference: string): ProcessedPayment | undefined {
        return this.processedPayments.get(reference);
    }
}
