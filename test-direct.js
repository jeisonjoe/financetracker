
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL,
        },
    },
});

async function main() {
    try {
        console.log("Connecting via DIRECT_URL...");
        // Try a raw query which usually requires session mode if prepared statements are involved with Prisma
        await prisma.$executeRaw`SELECT 1`;
        console.log("Connection Successful!");
    } catch (e) {
        console.error("Connection Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
