
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Attempting to connect to DB...");
        // Just try to count transactions
        const count = await prisma.transactions.count();
        console.log("Connection Successful! Transaction count:", count);
    } catch (e) {
        console.error("Connection Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
