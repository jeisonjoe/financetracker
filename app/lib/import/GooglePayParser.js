
export class GooglePayParser {

    parse(htmlContent) {
        const transactions = [];
        const cells = htmlContent.split('<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">');

        for (let i = 1; i < cells.length; i++) {
            const cell = cells[i];
            const tx = this.parseCell(cell);
            if (tx) {
                transactions.push(tx);
            }
        }
        return transactions;
    }

    parseCell(cell) {
        // 1. Transaction ID & Status
        const detailsMatch = cell.match(/<b>Details:<\/b><br>\s*&emsp;(.*?)<br>\s*&emsp;(Completed|Failed|Pending|Cancelled)/);
        if (!detailsMatch) return null;

        const transactionId = detailsMatch[1].trim();
        const status = detailsMatch[2].trim();

        if (status !== 'Completed') return null;

        // 2. Date Parsing
        const dateObj = this.parseDate(cell);
        const dateStr = dateObj.toISOString();

        // 3. Content Parsing (Payee, Amount, Type)
        const contentMatch = cell.match(/<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">([\s\S]*?)<br>/);
        const rawContent = contentMatch ? contentMatch[1].replace(/\n/g, '').trim() : "";
        const cleanContent = rawContent.replace(/&amp;/g, '&');

        const { amount, type, payee, wallet } = this.parseContent(cleanContent);

        return {
            external_id: transactionId,
            date: dateObj.toDateString(), // formatting for preview
            iso_date: dateStr,
            amount,
            type,
            payee,
            wallet,
            note: cleanContent,
            status,
            raw: cleanContent
        };
    }

    parseDate(cell) {
        try {
            // Priority 1: Full Date with Timezone
            const fullDateMatch = cell.match(/(\d{1,2} [A-Za-z]{3} \d{4}, \d{2}:\d{2}:\d{2} GMT[+-]\d{2}:\d{2})/);
            if (fullDateMatch) return new Date(fullDateMatch[1]);

            // Priority 2: Rough match near tag boundaries
            const roughMatch = cell.match(/(\d{1,2} [A-Za-z]{3} \d{4}.*?)(<br>|<\/div>)/);
            if (roughMatch) {
                const candidate = roughMatch[1].replace(/<.*?>/g, '').trim();
                const parsed = Date.parse(candidate);
                if (!isNaN(parsed)) return new Date(parsed);
            }

            // Priority 3: Month Year fallback
            const monthYearMatch = cell.match(/([A-Z][a-z]{2} \d{4})/);
            if (monthYearMatch) return new Date(monthYearMatch[1]);

            return new Date(0); // Epoch fallback
        } catch (e) {
            return new Date(0);
        }
    }

    parseContent(text) {
        let type = 'expense';
        let amount = 0.0;
        let payee = 'Unknown';
        let wallet = 'Google Pay';

        // Regex Patterns
        const receivedRegex = /Received ₹([\d,.]+) from (.*)/;
        const receivedGenericRegex = /Received ₹([\d,.]+)/;
        const paidRegex = /Paid ₹([\d,.]+) to (.*?) using (.*)/;
        const paidGenericRegex = /Paid ₹([\d,.]+) to (.*)/;
        const sentRegex = /Sent ₹([\d,.]+) using (.*)/;

        if (text.match(receivedRegex)) {
            const match = text.match(receivedRegex);
            type = 'income';
            amount = this.parseAmount(match[1]);
            payee = 'Self';
            // Often the 'from' name is in match[2]
            // We can use match[2] as the 'Source' or store it in note.
        }
        else if (text.match(receivedGenericRegex)) {
            const match = text.match(receivedGenericRegex);
            type = 'income';
            amount = this.parseAmount(match[1]);
        }
        else if (text.match(paidRegex)) {
            const match = text.match(paidRegex);
            type = 'expense';
            amount = this.parseAmount(match[1]);
            payee = match[2];
            wallet = match[3];
        }
        else if (text.match(sentRegex)) {
            const match = text.match(sentRegex);
            type = 'expense';
            amount = this.parseAmount(match[1]);
            payee = 'Transfer';
            wallet = match[2];
        }
        else if (text.match(paidGenericRegex)) {
            const match = text.match(paidGenericRegex);
            type = 'expense';
            amount = this.parseAmount(match[1]);
            payee = match[2];
        }

        return {
            amount,
            type,
            payee,
            wallet: this.normalizeWallet(wallet)
        };
    }

    parseAmount(str) {
        return parseFloat(str.replace(/,/g, ''));
    }

    normalizeWallet(rawWallet) {
        if (!rawWallet) return "Google Pay";

        // Account ending in 3957 or 6720 -> HDFC Debit Card
        if (rawWallet.includes("3957") || rawWallet.includes("6720")) return "HDFC Debit Card";

        // Account ending in 7464 -> SBI Debit Card
        if (rawWallet.includes("7464")) return "SBI Debit Card";

        return rawWallet;
    }
}
