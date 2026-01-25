import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module'; // Adjust path if needed
import { UsersService } from './src/users/users.service';

async function bootstrap() {
    // Suppress NestJS logs for cleaner output
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const usersService = app.get(UsersService);

    console.log("Starting Token Replenishment Test...");

    // 1. Create a mock user needing replenishment
    // Set reset date to 31 days ago
    const oldDate = Date.now() - (31 * 24 * 60 * 60 * 1000);
    const userId = "test_user_" + Math.random().toString(36).substr(2, 5);

    // We can't easily inject a user without using create methods, so we'll use internal map access if possible
    // OR create a legit user and then hack the date in memory (since we have the service instance)

    let user = await usersService.createUser(`test-${userId}@example.com`, "Test User", "hash");

    // Hack: Manually set properties that might not be exposed in create
    // We need to access the private map or use updateProfile + explicit field set if possible
    // Since lastTokenReset is in the interface, we can try casting or just updating the object in memory if we can retrieve it reference-wise.

    // The service returns a copy or reference? Usually reference in-memory map.
    // Let's rely on updateProfile if it supports partial updates, or just direct modification if we can get the object.

    // updateProfile supports partial User, so let's try pushing the old date directly if interface allows, 
    // BUT lastTokenReset wasn't in the updateProfile payload type explicitly in the code I saw earlier? 
    // Wait, I saw "lastTokenReset" added to User interface, but did I add it to updateProfile logic? 
    // Yes, updateProfile often iterates keys or specific checks. Let's check logic:
    // "if (data.lastTokenReset !== undefined) user.lastTokenReset = data.lastTokenReset;" -> I DID NOT ADD THIS LINE in updateProfile.
    // So updateProfile won't work for testing strictly via API.
    // However, for this test script using the service instance directly:

    // Let's access the user object and modify it directly if possible (in-memory map).
    // user object returned IS the object in the map in this simple implementation? YES.

    user.lastTokenReset = oldDate;
    user.aiTokens = 100; // Low tokens

    console.log(`[Setup] User ${user.id} tokens: ${user.aiTokens}, lastReset: ${new Date(user.lastTokenReset).toISOString()}`);

    // 2. Trigger Replenishment
    await usersService.checkAndReplenishTokens();

    // 3. Verify Replenishment
    const refreshedUser = await usersService.findById(user.id);
    if (refreshedUser.aiTokens === 500 && refreshedUser.lastTokenReset > oldDate) {
        console.log("✅ Replenishment Successful: Tokens reset to 500, date updated.");
    } else {
        console.error("❌ Replenishment Failed:", refreshedUser);
    }

    // 4. Test Top-Up
    console.log("[Test] Testing Top-Up...");
    await usersService.topUpTokens(user.id, 200);

    const toppedUpUser = await usersService.findById(user.id);
    if (toppedUpUser.aiTokens === 700) {
        console.log("✅ Top-Up Successful: Tokens now 700.");
    } else {
        console.error("❌ Top-Up Failed:", toppedUpUser.aiTokens);
    }

    // Cleanup (optional, but good for file system)
    // usersService.deleteUser(user.id) // Implementation doesn't have delete easily exposed?

    await app.close();
}

bootstrap();
