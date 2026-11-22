import fs from 'fs';
import officecrypto from 'officecrypto-tool';
import * as XLSX from 'xlsx';
import { MySqlClient } from '../app/server/db/MySqlClient.js';
import { MerchantRuleService } from '../app/server/services/MerchantRuleService.js';

async function main() {
  const userId = 'c7013c18-9d2a-4fe3-86d5-06aadb9885cd';

  // 1. Ensure Credit Card Bill subcategory exists under Bills & Utilities (id: 4)
  const existingSubcats = await MySqlClient.query(
    'SELECT id, name FROM categories WHERE user_id = ? AND parent_id = 4',
    [userId]
  );
  let ccSubcat = existingSubcats.find((c) => c.name.toLowerCase() === 'credit card bill');
  if (!ccSubcat) {
    const insertRes = await MySqlClient.query(
      'INSERT INTO categories (user_id, parent_id, name, type, icon, monthly_budget, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [userId, 4, 'Credit Card Bill', 'expense', JSON.stringify({ name: 'BiCreditCard' }), 0]
    );
    console.log('Created subcategory "Credit Card Bill" under Bills & Utilities with id:', insertRes.insertId);
  }

  // 2. Fetch all existing transactions to ensure zero duplicates
  const existingTxs = await MySqlClient.query(
    'SELECT transaction, created_at, amount, type FROM transactions WHERE user_id = ?',
    [userId]
  );

  const existingExtIds = new Set();
  const existingSig = new Set();

  for (const t of existingTxs) {
    try {
      const data = typeof t.transaction === 'string' ? JSON.parse(t.transaction) : t.transaction;
      if (data?.external_id) existingExtIds.add(data.external_id);
      const dt = new Date(t.created_at).toISOString().slice(0, 10);
      existingSig.add(dt + '_' + Math.round(Number(t.amount)) + '_' + t.type);
    } catch (e) {}
  }

  console.log(`Loaded ${existingTxs.length} existing transactions from DB (${existingExtIds.size} unique external_ids).`);

  // 3. Process SBI statement
  const sbiBuf = fs.readFileSync('AccountStatement_22112026_202137.xlsx');
  const sbiDec = await officecrypto.decrypt(sbiBuf, { password: '04923041101' });
  const sbiWb = XLSX.read(sbiDec, { type: 'buffer' });
  const sbiSheet = sbiWb.Sheets[sbiWb.SheetNames[0]];
  const sbiRows = XLSX.utils.sheet_to_json(sbiSheet, { header: 1 });

  const toInsert = [];

  for (let i = 17; i < sbiRows.length; i++) {
    const row = sbiRows[i];
    if (!row || !row[0] || !row[1]) continue;
    const rawDate = String(row[0]).trim();
    const parts = rawDate.split('/');
    if (parts.length !== 3) continue;
    const isoDate = parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    const details = String(row[1]).trim();
    const refNo = String(row[2] || '').trim();
    const debit = parseFloat(String(row[3] || '').replace(/,/g, ''));
    const credit = parseFloat(String(row[4] || '').replace(/,/g, ''));
    const type = !isNaN(debit) && debit > 0 ? 'expense' : 'income';
    const amount = type === 'expense' ? debit : credit;
    const closingBal = parseFloat(String(row[5] || '').replace(/,/g, '')) || 1036.45;

    let extId = refNo ? 'stmt_' + refNo : null;
    if (!extId) {
      const upiMatch =
        details.match(/UPI\/(?:DR|CR|REVERSAL)\/(\d+)/i) || details.match(/\/(\d{10,12})\//);
      if (upiMatch) extId = 'stmt_' + upiMatch[1];
      else extId = 'stmt_sbi_' + isoDate + '_' + amount;
    }

    const sig = isoDate + '_' + Math.round(amount) + '_' + type;
    if (existingExtIds.has(extId) || existingSig.has(sig)) continue;

    let category = type === 'income' ? 'Income' : 'Food & Dining';
    let subcategory = null;
    let payee = 'X Jijin';
    let note = 'Payment from X Jijin';

    toInsert.push({
      userId,
      type,
      amount,
      createdAt: isoDate + ' 00:00:00',
      wallet: 'SBI Debit Card',
      category,
      subcategory,
      payee,
      note,
      externalId: extId,
      closingBalance: closingBal,
      isReversal: false,
      reversalRef: '',
      isSalary: false,
      isSplit: false,
      splitPerson: null,
      splitType: type === 'income' ? 'settlement' : 'lent',
    });
  }

  // 4. Process HDFC statement
  const hdfcBuf = fs.readFileSync('Acct Statement_3957_22112026_20.19.02.xls');
  const hdfcWb = XLSX.read(hdfcBuf, { type: 'buffer' });
  const hdfcSheet = hdfcWb.Sheets[hdfcWb.SheetNames[0]];
  const hdfcRows = XLSX.utils.sheet_to_json(hdfcSheet, { header: 1 });

  for (let i = 22; i < hdfcRows.length; i++) {
    const row = hdfcRows[i];
    if (!row || !row[0] || !row[1]) continue;
    const rawDate = String(row[0]).trim();
    const parts = rawDate.split('/');
    if (parts.length !== 3) continue;
    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
    const isoDate = year + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
    const details = String(row[1]).trim();
    const refNo = String(row[2] || '').trim();
    const debit = parseFloat(String(row[4] || '').replace(/,/g, ''));
    const credit = parseFloat(String(row[5] || '').replace(/,/g, ''));
    const type = !isNaN(debit) && debit > 0 ? 'expense' : 'income';
    const amount = type === 'expense' ? debit : credit;
    const closingBal = parseFloat(String(row[6] || '').replace(/,/g, '')) || 135068.82;

    const extId = refNo ? 'stmt_' + refNo : 'stmt_hdfc_' + isoDate + '_' + amount;
    const sig = isoDate + '_' + Math.round(amount) + '_' + type;
    if (existingExtIds.has(extId) || existingSig.has(sig)) continue;

    // Intelligent categorization
    let category = 'Uncategorized';
    let subcategory = null;
    let payee = 'Merchant';
    let note = '';
    let isReversal = false;
    let isSplit = false;
    let splitPerson = null;
    let splitType = 'lent';

    const uDetails = details.toUpperCase();

    if (uDetails.includes('CUMTA')) {
      category = 'Travel';
      subcategory = 'Bus & Transit';
      payee = 'CUMTA Metro';
      note = 'Metro Commute';
    } else if (uDetails.includes('SURAM') && uDetails.includes('DOSA')) {
      category = 'Groceries';
      subcategory = 'Packaged Food';
      payee = 'Suram Srinivasulu';
      note = 'Dosa Maavu';
    } else if (uDetails.includes('PADMAKUMAR') && uDetails.includes('MILK')) {
      category = 'Groceries';
      subcategory = 'Dairy & Bakery';
      payee = 'Padmakumar R';
      note = 'Milk';
    } else if (uDetails.includes('KRISHNA') && uDetails.includes('MILK')) {
      category = 'Groceries';
      subcategory = 'Dairy & Bakery';
      payee = 'Krishna Vegetables Stores';
      note = 'Milk';
    } else if (uDetails.includes('MPA GUNASEKAR') && uDetails.includes('WATER')) {
      category = 'Bills & Utilities';
      subcategory = 'Water';
      payee = 'Mpa Gunasekar Water';
      note = 'Drinking Water Can';
    } else if (uDetails.includes('DHAYALAN') && uDetails.includes('HOMIESWATER')) {
      category = 'Transfer';
      subcategory = 'Self Transfer';
      payee = 'Dhayalan M';
      note = 'Shared Water Bill - Dhayalan M';
      isSplit = true;
      splitPerson = 'Dhayalan M';
      splitType = 'settlement';
    } else if (uDetails.includes('CRED CLUB') || uDetails.includes('PAYMENT ON CRED')) {
      category = 'Bills & Utilities';
      subcategory = 'Credit Card Bill';
      payee = 'CRED Club';
      note = 'Credit Card Bill Payment';
    } else if (uDetails.includes('MALRAJA') && uDetails.includes('EGGS')) {
      category = 'Groceries';
      subcategory = 'Fresh Produce';
      payee = 'Malraja Rice Merchant';
      note = 'Eggs & Provisions';
    } else if (uDetails.includes('JOHNYKUTTY') || uDetails.includes('EGG GRAVY')) {
      category = 'Food & Dining';
      subcategory = 'Dinner';
      payee = 'Johnykutty';
      note = 'Egg Gravy';
    } else if (uDetails.includes('SIZZLING CURRIES') || uDetails.includes('CHICKEN KULAMBU')) {
      category = 'Food & Dining';
      subcategory = 'Dinner';
      payee = 'The Sizzling Curries';
      note = 'Chicken Kulambu';
    } else if (uDetails.includes('GOOGLE INDIA DIGITAL')) {
      category = 'Bills & Utilities';
      subcategory = 'Mobile & Internet';
      payee = 'Google India Digital';
      note = 'Google One / Play Subscription';
    } else if (uDetails.includes('GUNASEKARAN')) {
      category = 'Food & Dining';
      subcategory = 'Cafes & Fast Food';
      payee = 'Gunasekaran N';
      note = 'Tea / Snacks';
    } else if (uDetails.includes('PREENU')) {
      category = 'Income';
      payee = 'Preenu S J';
      note = 'UPI Transfer from Preenu S J';
    } else if (uDetails.includes('VISWANATHAN') && uDetails.includes('CANCEL')) {
      category = 'Refund / Reversal';
      payee = 'Viswanathan Rajendra';
      note = 'Shoe Order Cancel Refund';
      isReversal = true;
    } else if (uDetails.includes('VISWANATHAN')) {
      category = 'Transfer';
      payee = 'Viswanathan Rajendra';
      note = 'Friend Settlement from Viswanathan Rajendra';
      isSplit = true;
      splitPerson = 'Viswanathan Rajendra';
      splitType = 'settlement';
    } else {
      const cleaned = MerchantRuleService.cleanNarration(details, type);
      category = type === 'income' ? 'Income' : 'Food & Dining';
      payee = cleaned.payee;
      note = cleaned.note;
    }

    toInsert.push({
      userId,
      type,
      amount,
      createdAt: isoDate + ' 00:00:00',
      wallet: 'HDFC Debit Card',
      category,
      subcategory,
      payee,
      note,
      externalId: extId,
      closingBalance: closingBal,
      isReversal,
      reversalRef: isReversal ? extId : '',
      isSalary: false,
      isSplit,
      splitPerson,
      splitType,
    });
  }

  console.log(`Found ${toInsert.length} new transactions to import.`);

  // 5. Insert into Database
  let inserted = 0;
  for (const item of toInsert) {
    const txPayload = {
      note: item.note,
      category: { key: item.category, name: item.category },
      ...(item.subcategory ? { subcategory: { key: item.subcategory, name: item.subcategory } } : {}),
      wallet: { key: item.wallet, name: item.wallet },
      payee: item.payee,
      external_id: item.externalId,
      imported_at: new Date().toISOString(),
      closing_balance: item.closingBalance,
      is_split: item.isSplit,
      split_person: item.splitPerson,
      split_type: item.splitType,
      is_reversal: item.isReversal,
      reversal_ref: item.reversalRef,
      is_salary: item.isSalary,
      is_micro_spend: item.amount <= 200,
    };

    await MySqlClient.query(
      'INSERT INTO transactions (user_id, type, amount, transaction, created_at) VALUES (?, ?, ?, ?, ?)',
      [item.userId, item.type, item.amount, JSON.stringify(txPayload), item.createdAt]
    );
    inserted++;
    console.log(
      `[${inserted}/${toInsert.length}] Inserted: ${item.createdAt.slice(0, 10)} | ${item.wallet} | ${item.type} | ₹${item.amount} | ${item.category}${item.subcategory ? ' (' + item.subcategory + ')' : ''} | ${item.payee}`
    );
  }

  // 6. Print summary
  const totalInDb = await MySqlClient.query(
    'SELECT count(*) as count, min(created_at) as earliest, max(created_at) as latest FROM transactions WHERE user_id = ?',
    [userId]
  );
  console.log('\n--- IMPORT COMPLETE ---');
  console.log(`Total transactions now in DB: ${totalInDb[0].count}`);
  console.log(`Date range: ${totalInDb[0].earliest} to ${totalInDb[0].latest}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
