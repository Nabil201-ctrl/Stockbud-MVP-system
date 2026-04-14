import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const sessions = await prisma.session.findMany();
        console.log('Sessions found:', sessions.length);
    } catch (e) {
        console.error('Error finding sessions:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
