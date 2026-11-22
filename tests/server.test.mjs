import test from "node:test";
import assert from "node:assert/strict";

import { DatabaseConfig } from "../app/server/config/DatabaseConfig.js";
import { DatabaseConfigurationError, ValidationError } from "../app/server/domain/errors.js";
import { MySqlClient } from "../app/server/db/MySqlClient.js";
import { ApiController } from "../app/server/http/ApiController.js";
import {
  CategoryEntity,
  FundGoalEntity,
  FundPlanEntity,
  RecurringItemEntity,
  TransactionEntity,
  UserEntity,
  WalletEntity,
} from "../app/server/domain/entities.js";
import { RepositoryFactory } from "../app/server/repositories/RepositoryFactory.js";
import { MySqlAuthProvider } from "../app/server/repositories/mysql/MySqlAuthProvider.js";
import { MySqlTransactionRepository } from "../app/server/repositories/mysql/MySqlTransactionRepository.js";
import { SupabaseAuthProvider } from "../app/server/repositories/supabase/SupabaseAuthProvider.js";
import { SupabaseTransactionRepository } from "../app/server/repositories/supabase/SupabaseTransactionRepository.js";
import { TransactionService } from "../app/server/services/TransactionService.js";
import { AnalyticsService } from "../app/server/services/AnalyticsService.js";
import { AuthService } from "../app/server/services/AuthService.js";
import { CategoryService } from "../app/server/services/CategoryService.js";
import { WalletService } from "../app/server/services/WalletService.js";
import { PlanningService } from "../app/server/services/PlanningService.js";
import { AiService, extractJsonFromText, parseStatementDate } from "../app/server/services/AiService.js";
import { MerchantRuleService } from "../app/server/services/MerchantRuleService.js";
import { GooglePayParser } from "../app/lib/import/GooglePayParser.js";

test("DatabaseConfig switches between mysql and supabase and rejects invalid values", () => {
  const original = process.env.DB_PROVIDER;
  try {
    process.env.DB_PROVIDER = "mysql";
    assert.equal(DatabaseConfig.getProvider(), "mysql");
    assert.equal(DatabaseConfig.isMysql(), true);
    assert.equal(DatabaseConfig.isSupabase(), false);

    process.env.DB_PROVIDER = "supabase";
    assert.equal(DatabaseConfig.getProvider(), "supabase");
    assert.equal(DatabaseConfig.isSupabase(), true);
    assert.equal(DatabaseConfig.isMysql(), false);

    process.env.DB_PROVIDER = "sqlite";
    assert.throws(() => DatabaseConfig.getProvider(), DatabaseConfigurationError);
  } finally {
    if (original === undefined) delete process.env.DB_PROVIDER;
    else process.env.DB_PROVIDER = original;
  }
});

test("RepositoryFactory resolves interchangeable MySQL and Supabase implementations", () => {
  const mysql = RepositoryFactory.createForProvider("mysql");
  assert.equal(mysql.provider, "mysql");
  assert.ok(mysql.authProvider instanceof MySqlAuthProvider);
  assert.ok(mysql.transactionRepo instanceof MySqlTransactionRepository);

  const supabase = RepositoryFactory.createForProvider("supabase");
  assert.equal(supabase.provider, "supabase");
  assert.ok(supabase.authProvider instanceof SupabaseAuthProvider);
  assert.ok(supabase.transactionRepo instanceof SupabaseTransactionRepository);
});

test("Domain entities normalize JSON strings, BigInt-like IDs, and defaults", () => {
  const user = new UserEntity({
    id: "user-1",
    email: "alex@example.com",
    firstName: "Alex",
    lastName: "Morgan",
  });
  assert.equal(user.fullName, "Alex Morgan");

  const fallbackUser = new UserEntity({ id: "u2", email: "sam@example.com" });
  assert.equal(fallbackUser.fullName, "sam");

  const tx = new TransactionEntity({
    id: 101n,
    user_id: "user-1",
    type: "expense",
    amount: "450",
    created_at: "2026-11-10T10:00:00.000Z",
    transaction: JSON.stringify({
      note: "Lunch",
      category: { name: "Food & Dining" },
      wallet: "HDFC Debit Card",
    }),
  });
  const json = tx.toJSON();
  assert.equal(json.id, "101");
  assert.equal(json.amount, 450);
  assert.equal(json.category, "Food & Dining");
  assert.equal(json.wallet, "HDFC Debit Card");

  const cat = new CategoryEntity({
    id: 5,
    name: "Groceries",
    icon: JSON.stringify({ name: "BiCart" }),
    monthly_budget: 5000,
  });
  assert.equal(cat.icon.name, "BiCart");
  assert.equal(cat.monthlyBudget, 5000);

  const wallet = new WalletEntity({ id: 2, name: "Cash", type: "cash" });
  assert.equal(wallet.toJSON().name, "Cash");
});

test("TransactionService validates inputs and normalizes payload", async () => {
  let captured = null;
  const fakeRepo = {
    async create(userId, payload) {
      captured = { userId, payload };
      return new TransactionEntity({ id: 1, user_id: userId, ...payload });
    },
  };
  const service = new TransactionService(fakeRepo);

  await assert.rejects(
    () => service.create("u1", { amount: 0, type: "expense" }),
    ValidationError
  );

  const created = await service.create("u1", {
    amount: 199.6,
    type: "income",
    note: "Freelance",
    category: "Salary",
    wallet: "SBI Debit Card",
  });

  assert.equal(captured.userId, "u1");
  assert.equal(captured.payload.amount, 200);
  assert.equal(created.type, "income");
  assert.equal(created.category, "Salary");
  assert.equal(created.wallet, "SBI Debit Card");
});

test("AnalyticsService computes summary, wallet balances, and category budgets", async () => {
  const now = new Date();
  const thisMonthIso = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
  const lastMonthIso = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString();

  const sampleTxs = [
    new TransactionEntity({
      id: 1,
      user_id: "u1",
      type: "income",
      amount: 10000,
      created_at: thisMonthIso,
      transaction: { wallet: { name: "HDFC Debit Card" }, category: { name: "Salary" } },
    }),
    new TransactionEntity({
      id: 2,
      user_id: "u1",
      type: "expense",
      amount: 3000,
      created_at: thisMonthIso,
      transaction: { wallet: { name: "HDFC Debit Card" }, category: { name: "Groceries" } },
    }),
    new TransactionEntity({
      id: 3,
      user_id: "u1",
      type: "expense",
      amount: 1500,
      created_at: lastMonthIso,
      transaction: { wallet: { name: "SBI Debit Card" }, category: { name: "Groceries" } },
    }),
  ];

  const analytics = new AnalyticsService(
    { async findInDateRange() { return sampleTxs; } },
    { async findAllForUser() { return [new CategoryEntity({ id: 1, name: "Groceries", monthly_budget: 2500 })]; } },
    { async findAllForUser() { return [new WalletEntity({ id: 1, name: "HDFC Debit Card", type: "debit" })]; } }
  );

  const overview = await analytics.getDashboardOverview("u1", "this_month");
  assert.equal(overview.summary.income, 10000);
  assert.equal(overview.summary.expense, 3000);
  assert.equal(overview.summary.balance, 7000);
  assert.equal(overview.summary.availableBalance, 5500);
  assert.equal(overview.summary.deltas.expense, 100);
  assert.equal(overview.summary.savingsRate, 70);
  assert.equal(overview.spendingPace.spendingCap, 2500);
  assert.equal(overview.spendingPace.utilizationPercent, 100);
  assert.equal(overview.dailyTrend.length, 14);

  const hdfc = overview.wallets.find((w) => w.name === "HDFC Debit Card");
  assert.equal(hdfc.balance, 7000);
  assert.equal(hdfc.earned, 10000);
  assert.equal(hdfc.spent, 3000);

  const groceries = overview.categoryBreakdown.find((c) => c.name === "Groceries");
  assert.equal(groceries.spent, 3000);
  assert.equal(groceries.budget, 2500);
  assert.equal(groceries.overBudget, true);
});

test("AuthService, CategoryService, and WalletService enforce validation and seeding", async () => {
  const authService = new AuthService({});
  await assert.rejects(() => authService.login("bad-email", "secret"), ValidationError);
  await assert.rejects(
    () => authService.register({ firstName: "A", lastName: "B", email: "a@b.com", password: "123" }),
    ValidationError
  );

  let seededCategories = [];
  const catService = new CategoryService({
    async seedDefaultsIfEmpty(_userId, defaults) {
      seededCategories = defaults.map((d, i) => new CategoryEntity({ id: i + 1, ...d }));
      return seededCategories;
    },
  });
  const cats = await catService.list("u1");
  assert.ok(cats.length >= 5);

  const walletService = new WalletService({
    async seedDefaultsIfEmpty(_userId, defaults) {
      return defaults.map((d, i) => new WalletEntity({ id: i + 1, ...d }));
    },
  });
  const wallets = await walletService.list("u1");
  assert.ok(wallets.some((w) => w.name === "HDFC Debit Card"));
});

test("GooglePayParser parses Completed HTML blocks and normalizes known bank cards", () => {
  const html = `
    <div>header</div>
    <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Paid ₹420.50 to Blue Tokai using Bank Account 3957<br>12 Jan 2026, 09:47:52 GMT+05:30</div>
      <b>Details:</b><br>&emsp;TX123<br>&emsp;Completed<br>
    </div>
    <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
      <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Received ₹1,500 from Alex<br>13 Jan 2026, 10:00:00 GMT+05:30</div>
      <b>Details:</b><br>&emsp;TX124<br>&emsp;Completed<br>
    </div>
  `;

  const parser = new GooglePayParser();
  const parsed = parser.parse(html);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].external_id, "TX123");
  assert.equal(parsed[0].amount, 420.5);
  assert.equal(parsed[0].wallet, "HDFC Debit Card");
  assert.equal(parsed[1].type, "income");
  assert.equal(parsed[1].amount, 1500);
});

test("MySqlClient.toMysqlDateTime and ApiController.errorResponse format values cleanly", async () => {
  const formatted = MySqlClient.toMysqlDateTime("2026-11-11T06:30:45.123Z");
  assert.equal(formatted, "2026-11-11 06:30:45");

  const validationResp = ApiController.errorResponse(new ValidationError("Bad input"));
  assert.equal(validationResp.status, 400);
  const body = await validationResp.json();
  assert.equal(body.error, "Bad input");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("TransactionService validates wallet transfers and AnalyticsService applies opening balances & transfers without inflating income/expense", async () => {
  const createdTxs = [];
  const txService = new TransactionService({
    async create(userId, payload) {
      const entity = new TransactionEntity({ id: 10, user_id: userId, ...payload });
      createdTxs.push(entity);
      return entity;
    },
  });

  await assert.rejects(
    () =>
      txService.create("u1", {
        type: "transfer",
        amount: 500,
        wallet: "Cash",
        to_wallet: "Cash",
      }),
    ValidationError
  );

  const transfer = await txService.create("u1", {
    type: "transfer",
    amount: 1500,
    wallet: "HDFC Debit Card",
    to_wallet: "Cash",
  });
  assert.equal(transfer.type, "transfer");
  assert.equal(transfer.to_wallet, "Cash");

  const nowIso = new Date().toISOString();
  const txs = [
    new TransactionEntity({
      id: 1,
      user_id: "u1",
      type: "income",
      amount: 10000,
      created_at: nowIso,
      transaction: { wallet: { name: "HDFC Debit Card" }, category: { name: "Salary" } },
    }),
    new TransactionEntity({
      id: 2,
      user_id: "u1",
      type: "transfer",
      amount: 2500,
      created_at: nowIso,
      transaction: {
        wallet: { name: "HDFC Debit Card" },
        to_wallet: { name: "Cash" },
        category: { name: "Transfer" },
      },
    }),
  ];

  const analytics = new AnalyticsService(
    { async findInDateRange() { return txs; } },
    { async findAllForUser() { return []; } },
    {
      async findAllForUser() {
        return [
          new WalletEntity({ id: 1, name: "HDFC Debit Card", type: "debit", opening_balance: 5000 }),
          new WalletEntity({ id: 2, name: "Cash", type: "cash", opening_balance: 500 }),
        ];
      },
    }
  );

  const overview = await analytics.getDashboardOverview("u1", "this_month");
  assert.equal(overview.summary.income, 10000);
  assert.equal(overview.summary.expense, 0);
  assert.equal(overview.summary.availableBalance, 15500);

  const hdfc = overview.wallets.find((w) => w.name === "HDFC Debit Card");
  const cash = overview.wallets.find((w) => w.name === "Cash");
  assert.equal(hdfc.balance, 12500);
  assert.equal(hdfc.transferredOut, 2500);
  assert.equal(cash.balance, 3000);
  assert.equal(cash.transferredIn, 2500);
});

test("PlanningService manages goals, recurring schedules, and cashflow allocation", async () => {
  const nextMonth = RecurringItemEntity.computeNextDueDate("2026-01-15", "monthly");
  assert.equal(nextMonth, "2026-02-15");

  let storedGoal = new FundGoalEntity({
    id: 1,
    user_id: "u1",
    name: "Emergency Fund",
    target_amount: 10000,
    current_amount: 4000,
    monthly_contribution: 2000,
    status: "active",
  });
  let storedRecurring = new RecurringItemEntity({
    id: 2,
    user_id: "u1",
    title: "Rent",
    type: "expense",
    amount: 12000,
    frequency: "monthly",
    next_due_date: new Date().toISOString().slice(0, 10),
    category: "Bills & Utilities",
    wallet: "HDFC Debit Card",
    is_active: true,
    auto_reserve: true,
  });
  const loggedTransactions = [];

  const service = new PlanningService(
    {
      async findAllForUser() { return [storedGoal]; },
      async findById(id) { return id === "1" ? storedGoal : null; },
      async update(_id, _uid, patch) {
        storedGoal = new FundGoalEntity({
          ...storedGoal.toJSON(),
          ...(patch.currentAmount !== undefined ? { current_amount: patch.currentAmount } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        });
        return storedGoal;
      },
    },
    {
      async findAllForUser() { return [storedRecurring]; },
      async findById(id) { return id === "2" ? storedRecurring : null; },
      async update(_id, _uid, patch) {
        storedRecurring = new RecurringItemEntity({
          ...storedRecurring.toJSON(),
          ...(patch.nextDueDate !== undefined ? { next_due_date: patch.nextDueDate } : {}),
        });
        return storedRecurring;
      },
    },
    {
      async findForUser() {
        return new FundPlanEntity({
          user_id: "u1",
          monthly_income_target: 50000,
          needs_percent: 50,
          wants_percent: 30,
          savings_percent: 20,
          reserve_buffer: 3000,
        });
      },
      async upsert(_uid, payload) {
        return new FundPlanEntity({ user_id: "u1", ...payload });
      },
    },
    {
      async findInDateRange() { return []; },
      async create(_uid, payload) {
        const tx = new TransactionEntity({ id: 99, user_id: "u1", ...payload });
        loggedTransactions.push(tx);
        return tx;
      },
    },
    {
      async findAllForUser() {
        return [new CategoryEntity({ id: 1, name: "Groceries", monthly_budget: 5000 })];
      },
    }
  );

  // Percentage validation
  await assert.rejects(
    () => service.updatePlan("u1", { needs_percent: 60, wants_percent: 30, savings_percent: 20 }),
    ValidationError
  );

  // Standalone goal contribution completes goal when reaching target
  const updatedGoal = await service.adjustGoalAmount("1", "u1", { delta: 6000 });
  assert.equal(updatedGoal.current_amount, 10000);
  assert.equal(updatedGoal.status, "completed");

  // Process recurring cycle logs real transaction and advances due date
  const cycleResult = await service.processRecurringCycle("2", "u1", "log");
  assert.equal(loggedTransactions.length, 1);
  assert.equal(loggedTransactions[0].amount, 12000);
  assert.notEqual(cycleResult.item.next_due_date, new Date().toISOString().slice(0, 10));

  const overview = await service.getOverview("u1");
  assert.equal(overview.cashflow.plannedIncome, 50000);
  assert.equal(overview.cashflow.committedRecurringBills, 12000);
  assert.equal(overview.cashflow.reserveBuffer, 3000);
});

test("AiService parses CSV statements, flags new categories, and generates insights via Gemini/Claude", async () => {
  const unwrapped = extractJsonFromText('```json\n{"ok": true}\n```');
  assert.equal(unwrapped.ok, true);

  assert.equal(parseStatementDate("18/11/25"), "2025-11-18");
  assert.equal(parseStatementDate("12-Jan-2026"), "2026-01-12");

  let lastRequestUrl = "";
  const mockFetch = async (url, options) => {
    lastRequestUrl = String(url);
    const body = JSON.parse(options.body);
    const promptText = JSON.stringify(body);

    if (lastRequestUrl.includes("generativelanguage.googleapis.com")) {
      return {
        ok: true,
        async json() {
          return {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [
                          {
                            i: 0,
                            type: "expense",
                            payee: "Swiggy",
                            note: "Dinner order",
                            category: "Food & Dining",
                          },
                          {
                            i: 1,
                            type: "expense",
                            payee: "Spotify",
                            note: "Music plan",
                            category: "Subscriptions",
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          };
        },
      };
    }

    if (lastRequestUrl.includes("api.anthropic.com") && promptText.includes("usageTrends")) {
      return {
        ok: true,
        async json() {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  headline: "Spending is well within monthly income.",
                  healthScore: 84,
                  healthLabel: "Healthy",
                  highlights: [{ title: "Savings", detail: "Strong surplus", impact: "positive", metric: "70%" }],
                  usageTrends: [{ title: "Food spend", detail: "Moderate dining activity" }],
                  subscriptionsAndLeaks: [{ name: "Spotify", estimatedMonthly: 199, frequency: "monthly", note: "Recurring" }],
                  recommendations: [{ title: "Keep buffer", action: "Move surplus to emergency fund", potentialMonthlySavings: 500 }],
                }),
              },
            ],
          };
        },
      };
    }

    throw new Error(`Unexpected AI fetch call: ${lastRequestUrl}`);
  };

  const ai = new AiService({ fetchFn: mockFetch });
  const prevGeminiKey = process.env.GEMINI_API_KEY;
  const prevGoogleKey = process.env.GOOGLE_AI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_AI_API_KEY;
  try {
    assert.throws(() => ai.resolveCredentials({ provider: "gemini", apiKey: "" }), ValidationError);
  } finally {
    if (prevGeminiKey !== undefined) process.env.GEMINI_API_KEY = prevGeminiKey;
    if (prevGoogleKey !== undefined) process.env.GOOGLE_AI_API_KEY = prevGoogleKey;
  }

  const csvBuffer = Buffer.from(
    "Date,Narration,Chq./Ref.No.,Withdrawal Amt.,Deposit Amt.\n10/11/26,UPI/SWIGGY,UTR1001,450,\n11/11/26,SPOTIFY,,199,\n",
    "utf8"
  );

  const parsed = await ai.parseBankStatement({
    buffer: csvBuffer,
    fileName: "statement.csv",
    mimeType: "text/csv",
    existingCategories: [{ name: "Food & Dining", type: "expense" }],
    walletName: "HDFC Bank",
    provider: "gemini",
    apiKey: "test-gemini-key",
  });

  assert.equal(parsed.extractionMode, "hybrid");
  assert.equal(parsed.count, 2);
  assert.equal(parsed.transactions[0].date, "2026-11-10");
  assert.equal(parsed.transactions[0].category, "Food & Dining");
  assert.equal(parsed.transactions[0].suggestedNewCategory, false);
  assert.equal(parsed.transactions[0].external_id, "stmt_UTR1001");
  assert.equal(parsed.transactions[1].date, "2026-11-11");
  assert.equal(parsed.transactions[1].category, "Entertainment");
  assert.equal(parsed.transactions[1].suggestedNewCategory, true);

  const insights = await ai.generateSpendInsights({
    analytics: { period: "this_month", summary: { income: 50000, expense: 15000 } },
    planning: { cashflow: {}, goalsSummary: {}, recurringSummary: {} },
    transactions: [],
    provider: "claude",
    apiKey: "test-claude-key",
  });

  assert.equal(insights.provider, "claude");
  assert.equal(insights.insights.healthScore, 84);
  assert.equal(insights.insights.subscriptionsAndLeaks[0].name, "Spotify");

  // Verify deprecated model normalization and modern model support
  const deprecatedCreds = ai.resolveCredentials({ provider: "gemini", apiKey: "test-key", model: "gemini-2.5-pro" });
  assert.equal(deprecatedCreds.model, "gemini-3.8-flash");

  const modernCreds = ai.resolveCredentials({ provider: "gemini", apiKey: "test-key", model: "gemini-3.1-pro-preview" });
  assert.equal(modernCreds.model, "gemini-3.1-pro-preview");

  // Verify Interactions API response format with output_text and steps
  const mockInteractionsFetch = async (url) => {
    return {
      ok: true,
      async json() {
        return {
          id: "interaction-123",
          status: "completed",
          model: "gemini-3.8-flash",
          output_text: JSON.stringify({ ok: true, source: "interactions_api" }),
        };
      },
    };
  };

  const aiInteractions = new AiService({ fetchFn: mockInteractionsFetch });
  const testConnResult = await aiInteractions.testConnection({
    provider: "gemini",
    apiKey: "test-gemini-key",
    model: "gemini-3.8-flash",
  });
  assert.equal(testConnResult.ok, true);
  assert.equal(testConnResult.model, "gemini-3.8-flash");
});

test("MerchantRuleService cleans UPI narrations, pairs reversals, and detects friend splits", async () => {
  const { MerchantRuleService } = await import("../app/server/services/MerchantRuleService.js");

  const upiBreakfast = MerchantRuleService.cleanNarration(
    "UPI-SELVA KUMAR K-PAYTMQR6H5NVQ@PTYS-YESB0PTMUPI-568875919920-BREAKFAST"
  );
  assert.equal(upiBreakfast.payee, "Selva Kumar K");
  assert.equal(upiBreakfast.note, "Breakfast");
  assert.equal(upiBreakfast.reference, "568875919920");
  assert.equal(upiBreakfast.isReversal, false);
  assert.equal(upiBreakfast.isSplit, false);

  const reversal = MerchantRuleService.cleanNarration(
    "REV-UPI-50100643533957-JEISONJOE67-2@OKAXIS-659147363586-TOILET"
  );
  assert.equal(reversal.isReversal, true);
  assert.equal(reversal.type, "income");
  assert.equal(reversal.reference, "659147363586");

  const splitLent = MerchantRuleService.cleanNarration(
    "UPI-VISWANATHAN RAJENDRA-VISWANATHAN0709@OKAXIS-UTIB0000000-123456789012-LENDING",
    "expense"
  );
  assert.equal(splitLent.isSplit, true);
  assert.equal(splitLent.splitType, "lent");
  assert.equal(splitLent.splitPerson, "Viswanathan Rajendra");

  const salary = MerchantRuleService.categorizeTransaction({
    rawNarration: "FT- ADMINWARE SALARY NOV-50200034312986 - ADMINWARE SOFTWARE",
    amount: 61392,
    type: "income",
  });
  assert.equal(salary.isSalary, true);
  assert.equal(salary.category, "Salary");
  assert.equal(salary.payee, "Adminware Software");

  const metro = MerchantRuleService.categorizeTransaction({
    rawNarration: "UPI-CUMTA-PAYTMQR6CSWM7@PTYS-YESB0PTMUPI-123456789012-METRO COMMUTE",
    amount: 30,
    type: "expense",
  });
  assert.equal(metro.category, "Travel");
  assert.equal(metro.isMicroSpend, true);

  const hdfcTrain = MerchantRuleService.categorizeTransaction({
    rawNarration: "WDL TFR UPI/DR/667105010028/Indian R/SBIN/bdpg 2.ir@s/Pay 0097696162090 AT 02222",
    amount: 522,
    type: "expense",
  });
  assert.equal(hdfcTrain.category, "Travel");
  assert.equal(hdfcTrain.payee, "Indian R");
  assert.equal(hdfcTrain.reference, "667105010028");

  const momTransfer = MerchantRuleService.categorizeTransaction({
    rawNarration: "Mom",
    note: "Mom",
    payee: "Mlouisekala1977okaxi",
    amount: 20000,
    type: "expense",
  });
  assert.equal(momTransfer.category, "Transfer");

  const dressPurchase = MerchantRuleService.categorizeTransaction({
    rawNarration: "Dress",
    note: "Dress",
    payee: "Jafrin Joseph Antony",
    amount: 4400,
    type: "expense",
  });
  assert.equal(dressPurchase.category, "Shopping");
});

test("AnalyticsService nets reversals, tracks friend splits, computes micro-spends, and bounds salary cycle", async () => {
  const fakeTxRepo = {
    findInDateRange: async () => [
      new TransactionEntity({
        id: "tx-sal",
        type: "income",
        amount: 60000,
        createdAt: "2026-10-29T10:00:00Z",
        transaction: { payee: "Adminware Software", is_salary: true, category: { name: "Salary" } },
      }),
      new TransactionEntity({
        id: "tx-fail-debit",
        type: "expense",
        amount: 50,
        createdAt: "2026-11-01T12:00:00Z",
        transaction: { payee: "Chai Shop", note: "Tea" },
      }),
      new TransactionEntity({
        id: "tx-fail-reversal",
        type: "income",
        amount: 50,
        createdAt: "2026-11-01T12:05:00Z",
        transaction: { payee: "Reversal: Tea", is_reversal: true, note: "REV-UPI-123" },
      }),
      new TransactionEntity({
        id: "tx-lent",
        type: "expense",
        amount: 500,
        createdAt: "2026-11-02T14:00:00Z",
        transaction: { payee: "Viswanathan", is_split: true, split_person: "Viswanathan", split_type: "lent" },
      }),
      new TransactionEntity({
        id: "tx-metro",
        type: "expense",
        amount: 40,
        createdAt: "2026-11-03T09:00:00Z",
        transaction: { payee: "CUMTA", note: "Metro" },
      }),
    ],
  };
  const fakeCategoryRepo = { findAllForUser: async () => [] };
  const fakeWalletRepo = { findAllForUser: async () => [{ id: "w1", name: "HDFC Bank", openingBalance: 10000 }] };

  const analytics = new AnalyticsService(fakeTxRepo, fakeCategoryRepo, fakeWalletRepo);

  const overview = await analytics.getDashboardOverview("user-1", "all_time");

  // Reversal netting: ₹50 debit and ₹50 reversal should net to 0 expense impact
  assert.equal(overview.summary.reversals, 50);
  assert.equal(overview.summary.grossExpense, 590); // 50 + 500 + 40
  assert.equal(overview.summary.expense, 540); // 590 - 50 reversal

  // Friend splits summary
  assert.equal(overview.splitsSummary.totalLent, 500);
  assert.equal(overview.splitsSummary.byPerson[0].person, "Viswanathan");
  assert.equal(overview.splitsSummary.byPerson[0].balance, 500);

  // Micro spend leakage
  assert.equal(overview.merchantIntelligence.microSpendSummary.count, 2); // 50 + 40
  assert.equal(overview.merchantIntelligence.microSpendSummary.totalAmount, 90);

  // Salary cycle bounds
  const salaryBounds = analytics.getPeriodBounds("salary_cycle", [
    new TransactionEntity({
      id: "tx-sal",
      type: "income",
      amount: 60000,
      createdAt: "2026-10-29T10:00:00Z",
      transaction: { is_salary: true },
    }),
  ]);
  assert.equal(salaryBounds.isSalaryCycle, true);
  assert.equal(salaryBounds.payday, 29);
  assert.equal(salaryBounds.salaryAmount, 60000);
});

test("Subcategory hierarchy, individual subcategory budgets, and transaction categorization", async () => {
  // 1. CategoryEntity parent_id serialization
  const parentCat = new CategoryEntity({
    id: 1,
    name: "Food & Dining",
    type: "expense",
    monthly_budget: 15000,
  });
  const subCat = new CategoryEntity({
    id: 2,
    parent_id: 1,
    name: "Breakfast",
    type: "expense",
    monthly_budget: 4000,
  });
  assert.equal(parentCat.parentId, null);
  assert.equal(parentCat.toJSON().parent_id, null);
  assert.equal(subCat.parentId, "1");
  assert.equal(subCat.toJSON().parent_id, "1");

  // 2. CategoryService create subcategory
  let createdCategoryPayload = null;
  const catService = new CategoryService({
    async create(userId, payload) {
      createdCategoryPayload = payload;
      return new CategoryEntity({ id: 99, ...payload, user_id: userId });
    },
    async seedDefaultsIfEmpty(userId, defaults) {
      return defaults.map((d, i) => new CategoryEntity({ id: i + 1, ...d }));
    },
  });

  const created = await catService.create("u1", {
    name: "Petrol",
    parent_id: "10",
    monthly_budget: 5000,
  });
  assert.equal(created.name, "Petrol");
  assert.equal(created.parent_id, "10");
  assert.equal(createdCategoryPayload.parentId, "10");
  assert.equal(createdCategoryPayload.monthlyBudget, 5000);

  // 3. TransactionService normalizes subcategory
  let savedTx = null;
  const txService = new TransactionService({
    async create(userId, payload) {
      savedTx = payload;
      return new TransactionEntity({ id: 101, user_id: userId, ...payload });
    },
  });

  const tx = await txService.create("u1", {
    amount: 250,
    type: "expense",
    category: "Food & Dining",
    subcategory: "Breakfast",
    note: "Idli and Tea",
    wallet: "Cash",
  });
  assert.equal(tx.category, "Food & Dining");
  assert.equal(tx.subcategory, "Breakfast");
  assert.equal(savedTx.transaction.subcategory.name, "Breakfast");

  // 4. AnalyticsService computes subcategory breakdowns and individual limits
  const registeredCategories = [
    new CategoryEntity({ id: 1, name: "Food & Dining", monthly_budget: 10000 }),
    new CategoryEntity({ id: 2, parent_id: 1, name: "Breakfast", monthly_budget: 3000 }),
    new CategoryEntity({ id: 3, parent_id: 1, name: "Dinner", monthly_budget: 5000 }),
  ];

  const periodTxs = [
    new TransactionEntity({
      id: 1,
      type: "expense",
      amount: 1500,
      createdAt: new Date().toISOString(),
      transaction: {
        category: { name: "Food & Dining" },
        subcategory: { name: "Breakfast" },
      },
    }),
    new TransactionEntity({
      id: 2,
      type: "expense",
      amount: 2000,
      createdAt: new Date().toISOString(),
      transaction: {
        category: { name: "Food & Dining" },
        subcategory: { name: "Dinner" },
      },
    }),
    new TransactionEntity({
      id: 3,
      type: "expense",
      amount: 500,
      createdAt: new Date().toISOString(),
      transaction: {
        category: { name: "Food & Dining" },
      },
    }),
  ];

  const analytics = new AnalyticsService(
    {
      async findInDateRange() {
        return periodTxs;
      },
    },
    {
      async findAllForUser() {
        return registeredCategories;
      },
    },
    {
      async findAllForUser() {
        return [];
      },
    }
  );

  const overview = await analytics.getDashboardOverview("u1", "this_month");
  const foodBreakdown = overview.categoryBreakdown.find((c) => c.name === "Food & Dining");
  assert.ok(foodBreakdown);
  assert.equal(foodBreakdown.spent, 4000); // 1500 + 2000 + 500
  assert.equal(foodBreakdown.subcategories.length, 2);

  const bfastSub = foodBreakdown.subcategories.find((s) => s.name === "Breakfast");
  assert.equal(bfastSub.spent, 1500);
  assert.equal(bfastSub.budget, 3000);
  assert.equal(bfastSub.overBudget, false);

  const dinnerSub = foodBreakdown.subcategories.find((s) => s.name === "Dinner");
  assert.equal(dinnerSub.spent, 2000);
  assert.equal(dinnerSub.budget, 5000);

  // 5. MerchantRuleService subcategory mapping
  const ruleMatch = MerchantRuleService.categorizeTransaction({
    rawNarration: "UPI-SELVA KUMAR K-SELVA@OKAXIS-PAYMENT",
    amount: 120,
  });
  assert.equal(ruleMatch.category, "Food & Dining");
  assert.equal(ruleMatch.subcategory, "Breakfast");

  const trainMatch = MerchantRuleService.categorizeTransaction({
    rawNarration: "IRCTC TRAIN TICKET BOOKING",
    amount: 450,
  });
  assert.equal(trainMatch.category, "Travel");
  assert.equal(trainMatch.subcategory, "Train");

  const petrolMatch = MerchantRuleService.categorizeTransaction({
    rawNarration: "INDIAN OIL PETROL PUMP CHENNAI",
    amount: 500,
  });
  assert.equal(petrolMatch.category, "Travel");
  assert.equal(petrolMatch.subcategory, "Petrol & Fuel");
});



