import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { UsersService } from './src/users/users.service';

async function bootstrap() {

    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const usersService = app.get(UsersService);

    console.log("Starting Token Replenishment Test...");



    const oldDate = Date.now() - (31 * 24 * 60 * 60 * 1000);
    const userId = "test_user_" + Math.random().toString(36).substr(2, 5);

    let user = await usersService.createUser(`test-${userId}@example.com`, "Test User", "hash");

    (user as any).lastTokenReset = BigInt(oldDate);
    user.aiTokens = 100;

    console.log(`[Setup] User ${user.id} tokens: ${user.aiTokens}, lastReset: ${new Date(Number(user.lastTokenReset)).toISOString()}`);




    await usersService.checkAndReplenishTokens();


    const refreshedUser = await usersService.findById(user.id);
    if (refreshedUser.aiTokens === 500 && Number(refreshedUser.lastTokenReset) > oldDate) {
        console.log(" Replenishment Successful: Tokens reset to 500, date updated.");
    } else {
        console.error(" Replenishment Failed:", refreshedUser);
    }


    console.log("[Test] Testing Top-Up...");
    await usersService.topUpTokens(user.id, 200);

    const toppedUpUser = await usersService.findById(user.id);
    if (toppedUpUser.aiTokens === 700) {
        console.log(" Top-Up Successful: Tokens now 700.");
    } else {
        console.error(" Top-Up Failed:", toppedUpUser.aiTokens);
    }




    await app.close();
}

bootstrap();
