
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWallets() {
    console.log("Starting wallet fix...");

    try {
        const allTx = await prisma.transactions.findMany();
        console.log(`Checking ${allTx.length} transactions...`);

        let updates = 0;

        for (const tx of allTx) {
            if (!tx.transaction) continue;

            let walletName = tx.transaction.wallet;
            // Handle object case if it exists
            if (typeof walletName === 'object' && walletName.name) {
                walletName = walletName.name;
            }

            let newWallet = null;

            if (walletName) {
                if (walletName.includes("3957")) newWallet = "HDFC Debit Card";
                else if (walletName.includes("6720")) newWallet = "SBI Debit Card";
                else if (walletName.includes("7464")) {
                    // Assuming 7464 is a legacy reference to SBI based on context history, 
                    // BUT user said "Only these wallets should exist: 6720(SBI), 3957(HDFC)".
                    // If 7464 exists, it might be an orphaned/old card. 
                    // I will map it to SBI if it was previously labeled SBI, but let's be careful.
                    // Actually, in previous steps 7464 was explicitly SBI. User likely replaced card 7464 with 6720.
                    newWallet = "SBI Debit Card";
                }
            }

            if (newWallet && newWallet !== walletName) {
                const updatedMeta = {
                    ...tx.transaction,
                    wallet: { name: newWallet }
                };

                await prisma.transactions.update({
                    where: { id: tx.id },
                    data: { transaction: updatedMeta }
                });
                updates++;
            }
        }

        console.log(`Fixed ${updates} transactions.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixWallets();
