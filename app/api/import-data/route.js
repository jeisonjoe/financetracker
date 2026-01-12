import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';


export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'app/dataImports/My Activity.html');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "File not found at " + filePath }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const transactions = [];

        // Split by the outer cell class used in Google Pay export
        const cells = fileContent.split('<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">');

        for (let i = 1; i < cells.length; i++) {
            const cell = cells[i];

            // 1. Transaction ID & Status
            // Pattern: <b>Details:</b><br>&emsp;{ID}<br>&emsp;{Status}<br>
            const detailsMatch = cell.match(/<b>Details:<\/b><br>\s*&emsp;(.*?)<br>\s*&emsp;(Completed|Failed|Pending|Cancelled)/);
            if (!detailsMatch) continue;

            const transactionId = detailsMatch[1].trim();
            const status = detailsMatch[2].trim();

            // Only process Completed transactions
            if (status !== 'Completed') continue;

            // 2. Date
            let dateStr = "Unknown Date";
            let dateObj = new Date(0); // Default to Epoch if missing

            // Try specific format first: 12 Jan 2026, 09:47:52 GMT+05:30
            const fullDateMatch = cell.match(/(\d{1,2} [A-Za-z]{3} \d{4}, \d{2}:\d{2}:\d{2} GMT[+-]\d{2}:\d{2})/);
            // Try without GMT or partial
            const roughMatch = cell.match(/(\d{1,2} [A-Za-z]{3} \d{4}.*?)(<br>|<\/div>)/);

            if (fullDateMatch) {
                dateStr = fullDateMatch[1];
                dateObj = new Date(dateStr);
            } else if (roughMatch) {
                // Try to parse the rough match string
                const candidate = roughMatch[1].replace(/<.*?>/g, '').trim();
                dateStr = candidate;
                const parsed = Date.parse(candidate);
                if (!isNaN(parsed)) {
                    dateObj = new Date(parsed);
                }
            } else {
                // Try finding just Month Year
                // Match any 3 letters followed by 4 digits (year)
                const monthYearMatch = cell.match(/([A-Z][a-z]{2} \d{4})/);
                if (monthYearMatch) {
                    dateStr = monthYearMatch[1];
                    dateObj = new Date(dateStr);
                }
            }

            // If checking fails, dateObj remains Epoch. We do NOT skip.

            // 3. Content (Description)
            const contentMatch = cell.match(/<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">([\s\S]*?)<br>/);
            const rawContent = contentMatch ? contentMatch[1].replace(/\n/g, '').trim() : "";
            const cleanContent = rawContent.replace(/&amp;/g, '&');

            // 4. Parsing Logic for Amount, Payee (To), Wallet (From)
            let type = 'expense';
            let amount = 0.0;
            let payee = 'Unknown';
            let wallet = 'Unknown';

            // Regex Patterns
            const receivedRegex = /Received ₹([\d,.]+) from (.*)/;
            const receivedGenericRegex = /Received ₹([\d,.]+)/;
            const paidRegex = /Paid ₹([\d,.]+) to (.*?) using (.*)/;
            const paidGenericRegex = /Paid ₹([\d,.]+) to (.*)/;
            const sentRegex = /Sent ₹([\d,.]+) using (.*)/;

            if (cleanContent.match(receivedRegex)) {
                const match = cleanContent.match(receivedRegex);
                type = 'income';
                amount = parseFloat(match[1].replace(/,/g, ''));
                payee = 'Self'; // Receiver is self
                wallet = match[2]; // "from {Sender}" - treating sender as source/wallet context or logic? 
                // actually for received: "Received ₹X from Y". 
                // My logic: From = Y, To = My Account. But usually wallet represents MY wallet. 
                // Google Pay export doesn't always show which of MY wallets received it.
                // Let's store "Sender: Y" in Note.
                wallet = "Google Pay";
            } else if (cleanContent.match(receivedGenericRegex)) {
                const match = cleanContent.match(receivedGenericRegex);
                type = 'income';
                amount = parseFloat(match[1].replace(/,/g, ''));
                wallet = "Google Pay";
            } else if (cleanContent.match(paidRegex)) {
                const match = cleanContent.match(paidRegex);
                type = 'expense';
                amount = parseFloat(match[1].replace(/,/g, ''));
                payee = match[2];
                wallet = match[3];
            } else if (cleanContent.match(sentRegex)) {
                const match = cleanContent.match(sentRegex);
                type = 'expense';
                amount = parseFloat(match[1].replace(/,/g, ''));
                payee = "Transfer/Unknown";
                wallet = match[2];
            } else if (cleanContent.match(paidGenericRegex)) {
                const match = cleanContent.match(paidGenericRegex);
                type = 'expense';
                amount = parseFloat(match[1].replace(/,/g, ''));
                payee = match[2];
                wallet = "Google Pay";
            }

            transactions.push({
                external_id: transactionId,
                date: dateStr,
                iso_date: dateObj.toISOString(),
                amount: amount,
                type: type,
                payee: payee,
                wallet: wallet,
                note: cleanContent,
                status: status,
                raw: cleanContent
            });
        }

        return NextResponse.json({
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("Parse Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
