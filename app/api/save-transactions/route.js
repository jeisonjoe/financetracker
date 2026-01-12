import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST(req) {
    try {
        const body = await req.json();
        const { transactions, userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        if (!transactions || !Array.isArray(transactions)) {
            return NextResponse.json({ error: "Invalid transactions data" }, { status: 400 });
        }

        // 1. Fetch all existing transactions for this user to check for duplicates
        // We need to retrieve the JSON 'transaction' field to check 'external_id'
        const existingRecords = await prisma.transactions.findMany({
            where: { user_id: userId },
            select: { id: true, transaction: true }
        });

        // Create a Map of external_id -> database_id
        const existingMap = new Map();
        existingRecords.forEach(r => {
            if (r.transaction && r.transaction.external_id) {
                existingMap.set(r.transaction.external_id, r.id);
            }
        });

        const toCreate = [];
        const toUpdate = [];

        // 2. Classify incoming transactions
        for (const tx of transactions) {
            const extId = tx.transaction.external_id;
            const dbId = existingMap.get(extId);

            const recordData = {
                user_id: userId,
                amount: BigInt(Math.round(tx.amount || 0)),
                type: tx.type,
                created_at: tx.created_at,
                transaction: tx.transaction // Updated content (e.g. new wallet mapping)
            };

            if (dbId) {
                toUpdate.push({ id: dbId, data: recordData });
            } else {
                toCreate.push(recordData);
            }
        }

        // 3. Perform Bulk Insert for New Records
        let imported = 0;
        const BATCH_SIZE = 50;
        let firstError = null;

        if (toCreate.length > 0) {
            for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
                const chunk = toCreate.slice(i, i + BATCH_SIZE);
                try {
                    const result = await prisma.transactions.createMany({
                        data: chunk,
                        skipDuplicates: true
                    });
                    imported += result.count;
                } catch (e) {
                    console.error(`Insert Batch ${i} failed:`, e);
                    if (!firstError) firstError = "Insert error: " + e.message;
                }
            }
        }

        // 4. Perform Updates for Existing Records (Parallel Batches)
        // Updating one-by-one is necessary as there is no bulk lookup-update in standard SQL/Prisma without raw queries on temp tables
        let updated = 0;
        if (toUpdate.length > 0) {
            // limit concurrency
            for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
                const chunk = toUpdate.slice(i, i + BATCH_SIZE);
                const promises = chunk.map(item =>
                    prisma.transactions.update({
                        where: { id: item.id },
                        data: {
                            amount: item.data.amount,
                            // type and created_at usually don't change for same ID, but we update them to be safe
                            type: item.data.type,
                            // created_at: item.data.created_at, // Optional: keep original date or update? safely keep or update.
                            transaction: item.data.transaction
                        }
                    })
                );

                try {
                    await Promise.all(promises);
                    updated += chunk.length;
                } catch (e) {
                    console.error(`Update Batch ${i} failed:`, e);
                    if (!firstError) firstError = "Update error: " + e.message;
                }
            }
        }

        return NextResponse.json({
            success: true,
            imported: imported,
            updated: updated,
            failed: 0, // Simplified
            firstError: firstError
        });

    } catch (error) {
        console.error("Save API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
