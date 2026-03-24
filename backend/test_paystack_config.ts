import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PaymentsService } from './src/payments/payments.service';

async function bootstrap() {
    try {
        const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
        const paymentsService = app.get(PaymentsService);

        console.log("Attempting to verify Paystack configuration...");

        try {
            
            
            await paymentsService.initializeTransaction(
                { email: 'test@example.com', id: 'verification_user' },
                1,
                10,
                'http://localhost:3000/callback'
            );
            console.log(" Paystack API call successful (Configuration verified)");
        } catch (error) {
            if (error.message === 'Paystack is not configured') {
                console.error(" Paystack Secret Key is NOT loaded!");
                process.exit(1);
            } else {
                
                
                console.log(" Paystack Key loaded. API response:", error.message || error.response?.data);
            }
        }

        await app.close();
    } catch (err) {
        console.error("Failed to bootstrap app:", err);
        process.exit(1);
    }
}

bootstrap();
