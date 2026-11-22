import { MerchantRuleService } from "./MerchantRuleService.js";

/**
 * Computes date ranges and aggregated financial analytics across periods,
 * wallets, spending categories, salary cycles, merchant intelligence, and friend splits.
 */
export class AnalyticsService {
  constructor(transactionRepo, categoryRepo, walletRepo) {
    this.transactionRepo = transactionRepo;
    this.categoryRepo = categoryRepo;
    this.walletRepo = walletRepo;
  }

  getPeriodBounds(period = "this_month", referenceTransactions = []) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (period === "last_month") {
      return {
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
        isSalaryCycle: false,
      };
    }

    if (period === "last_3_months") {
      return {
        start: new Date(year, month - 2, 1, 0, 0, 0, 0),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
        isSalaryCycle: false,
      };
    }

    if (period === "all_time") {
      return { start: null, end: null, isSalaryCycle: false };
    }

    if (period === "salary_cycle") {
      // Find latest salary credit to anchor payday-to-payday cycle
      const salaryTxns = (referenceTransactions || [])
        .filter((tx) => {
          const meta = tx.meta || tx.transaction || {};
          const isSalary =
            Boolean(meta.is_salary) ||
            tx.category?.name?.toLowerCase() === "salary" ||
            /ADMINWARE|SALARY/i.test(`${tx.payee || meta.payee || ""} ${tx.note || meta.note || ""}`);
          return tx.type === "income" && isSalary;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (salaryTxns.length > 0) {
        const latestSalary = salaryTxns[0];
        const salaryDate = new Date(latestSalary.createdAt);
        const start = new Date(salaryDate.getFullYear(), salaryDate.getMonth(), salaryDate.getDate(), 0, 0, 0, 0);
        // Next projected salary date (approx 1 month later)
        const nextSalaryDate = new Date(salaryDate.getFullYear(), salaryDate.getMonth() + 1, salaryDate.getDate(), 23, 59, 59, 999);
        return {
          start,
          end: nextSalaryDate,
          isSalaryCycle: true,
          salaryAmount: latestSalary.amount,
          payday: salaryDate.getDate(),
          lastSalaryDate: start.toISOString(),
          nextSalaryDate: nextSalaryDate.toISOString(),
        };
      }
    }

    return {
      start: new Date(year, month, 1, 0, 0, 0, 0),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      isSalaryCycle: false,
    };
  }

  summarizeTotals(transactions) {
    let income = 0;
    let expense = 0;
    let transfers = 0;
    let reversals = 0;

    for (const tx of transactions) {
      const meta = tx.meta || tx.transaction || {};
      const payee = tx.payee || meta.payee || "";
      const note = tx.note || meta.note || "";
      const isReversal =
        Boolean(meta.is_reversal) ||
        tx.category?.name === "Refund / Reversal" ||
        payee.toLowerCase().startsWith("reversal:") ||
        note.toUpperCase().startsWith("REV-UPI");

      if (isReversal) {
        reversals += tx.amount;
      } else if (tx.type === "income") {
        income += tx.amount;
      } else if (tx.type === "transfer") {
        transfers += tx.amount;
      } else {
        expense += tx.amount;
      }
    }

    // Net out reversal refunds so failed transactions don't inflate expense or income totals
    const netExpense = Math.max(0, expense - reversals);

    return {
      income,
      expense: netExpense,
      grossExpense: expense,
      reversals,
      transfers,
      balance: income - netExpense,
      count: transactions.length,
    };
  }

  percentDelta(current, previous) {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
  }

  computeSplitsSummary(allTransactions) {
    const splitsSummary = {
      totalLent: 0,
      totalBorrowed: 0,
      totalSettled: 0,
      byPerson: [],
    };
    const personMap = new Map();

    for (const tx of allTransactions) {
      const meta = tx.meta || tx.transaction || {};
      const combinedText = `${tx.note || meta.note || ""} ${tx.payee || meta.payee || ""}`;
      const isSplit =
        Boolean(meta.is_split) ||
        /LENDING|LENT|BORROW|HOMIES|SPLIT|ROOMMATE/i.test(combinedText);
      if (!isSplit) continue;

      const rawPerson = meta.split_person || tx.payee || meta.payee || "Friend";
      const person = MerchantRuleService.titleCase(rawPerson);
      const splitType =
        meta.split_type || (tx.type === "income" ? "settlement" : "lent");
      const isSettled = Boolean(meta.settled);

      if (!personMap.has(person)) {
        personMap.set(person, {
          person,
          lent: 0,
          borrowed: 0,
          settled: 0,
          balance: 0, // positive = they owe user, negative = user owes them
          transactionCount: 0,
          transactions: [],
          lastDate: tx.createdAt,
        });
      }

      const pEntry = personMap.get(person);
      pEntry.transactionCount += 1;
      pEntry.transactions.push({
        id: tx.id,
        date: tx.createdAt,
        amount: tx.amount,
        type: splitType,
        note: meta.note || meta.payee,
        settled: isSettled,
      });

      if (splitType === "lent") {
        if (!isSettled) {
          splitsSummary.totalLent += tx.amount;
          pEntry.lent += tx.amount;
          pEntry.balance += tx.amount;
        } else {
          splitsSummary.totalSettled += tx.amount;
          pEntry.settled += tx.amount;
        }
      } else if (splitType === "borrowed") {
        if (!isSettled) {
          splitsSummary.totalBorrowed += tx.amount;
          pEntry.borrowed += tx.amount;
          pEntry.balance -= tx.amount;
        } else {
          splitsSummary.totalSettled += tx.amount;
          pEntry.settled += tx.amount;
        }
      } else if (splitType === "settlement") {
        splitsSummary.totalSettled += tx.amount;
        pEntry.settled += tx.amount;
        pEntry.balance -= tx.amount;
      }
    }

    splitsSummary.byPerson = Array.from(personMap.values())
      .map((p) => ({
        ...p,
        status: p.balance > 0 ? "owes_you" : p.balance < 0 ? "you_owe" : "settled",
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return splitsSummary;
  }

  computeMerchantIntelligence(periodTransactions, currentExpense) {
    const merchantMap = new Map();
    let microSpendCount = 0;
    let microSpendTotal = 0;
    const microMerchantMap = new Map();

    for (const tx of periodTransactions) {
      if (tx.type !== "expense") continue;
      const rawPayee = tx.payee || tx.meta?.payee || tx.transaction?.payee || tx.note || "Unknown";
      const payee = MerchantRuleService.titleCase(rawPayee.slice(0, 40));
      const catName = tx.category?.name || "Uncategorized";

      if (!merchantMap.has(payee)) {
        merchantMap.set(payee, {
          name: payee,
          category: catName,
          totalSpent: 0,
          transactionCount: 0,
          avgTicketSize: 0,
        });
      }
      const m = merchantMap.get(payee);
      m.totalSpent += tx.amount;
      m.transactionCount += 1;

      if (tx.amount <= 200) {
        microSpendCount += 1;
        microSpendTotal += tx.amount;
        microMerchantMap.set(payee, (microMerchantMap.get(payee) || 0) + tx.amount);
      }
    }

    for (const m of merchantMap.values()) {
      m.avgTicketSize = Math.round(m.totalSpent / m.transactionCount);
    }

    const topMerchants = Array.from(merchantMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8);

    const topMicroSpots = Array.from(microMerchantMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const microSpendSummary = {
      threshold: 200,
      count: microSpendCount,
      totalAmount: microSpendTotal,
      percentOfExpenses:
        currentExpense > 0 ? Math.round((microSpendTotal / currentExpense) * 100) : 0,
      topMicroSpots,
      avgMicroSpend: microSpendCount > 0 ? Math.round(microSpendTotal / microSpendCount) : 0,
    };

    return { topMerchants, microSpendSummary };
  }

  async getDashboardOverview(userId, period = "this_month") {
    const [allTransactions, registeredCategories, registeredWallets] = await Promise.all([
      this.transactionRepo.findInDateRange(userId, null, null, null),
      this.categoryRepo.findAllForUser(userId),
      this.walletRepo.findAllForUser(userId),
    ]);

    const bounds = this.getPeriodBounds(period, allTransactions);
    const { start, end } = bounds;

    const prevBounds =
      period === "last_month"
        ? {
            start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1, 0, 0, 0, 0),
            end: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 0, 23, 59, 59, 999),
          }
        : this.getPeriodBounds("last_month");

    const periodTransactions = allTransactions.filter((tx) => {
      const time = new Date(tx.createdAt).getTime();
      if (start && time < start.getTime()) return false;
      if (end && time > end.getTime()) return false;
      return true;
    });

    const previousTransactions =
      period === "all_time"
        ? []
        : allTransactions.filter((tx) => {
            const time = new Date(tx.createdAt).getTime();
            return time >= prevBounds.start.getTime() && time <= prevBounds.end.getTime();
          });

    const currentSummary = this.summarizeTotals(periodTransactions);
    const previousSummary = this.summarizeTotals(previousTransactions);
    const allTimeSummary = this.summarizeTotals(allTransactions);

    // Monthly or Salary-Cycle spending pace calculation
    const now = new Date();
    let daysElapsed = Math.max(1, now.getDate());
    let daysRemaining = Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1);
    let totalCycleDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (bounds.isSalaryCycle && bounds.start && bounds.end) {
      const totalMs = bounds.end.getTime() - bounds.start.getTime();
      totalCycleDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
      const elapsedMs = Math.max(0, now.getTime() - bounds.start.getTime());
      daysElapsed = Math.max(1, Math.min(totalCycleDays, Math.round(elapsedMs / (1000 * 60 * 60 * 24))));
      daysRemaining = Math.max(1, totalCycleDays - daysElapsed);
    }

    const configuredBudgetTotal = registeredCategories
      .filter((c) => c.type !== "income" && c.name?.trim().toLowerCase() !== "transfer")
      .reduce((sum, c) => sum + (Number(c.monthlyBudget) || 0), 0);

    const spendingCap =
      bounds.isSalaryCycle && bounds.salaryAmount
        ? bounds.salaryAmount
        : configuredBudgetTotal > 0
        ? configuredBudgetTotal
        : currentSummary.income;

    const remainingBudget = spendingCap - currentSummary.expense;
    const dailyAllowance =
      spendingCap > 0 && remainingBudget > 0
        ? Math.round((remainingBudget / daysRemaining) * 100) / 100
        : 0;
    const utilizationPercent =
      spendingCap > 0
        ? Math.min(100, Math.round((currentSummary.expense / spendingCap) * 100))
        : currentSummary.expense > 0
        ? 100
        : 0;
    const avgDailySpend = Math.round((currentSummary.expense / daysElapsed) * 100) / 100;
    const projectedMonthSpend = Math.round(avgDailySpend * totalCycleDays);
    const savingsRate =
      currentSummary.income > 0
        ? Math.round(((currentSummary.income - currentSummary.expense) / currentSummary.income) * 100)
        : 0;

    // 14-day daily cashflow trend
    const trendEndDate =
      period === "last_month" && end
        ? new Date(end.getFullYear(), end.getMonth(), end.getDate())
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyMap = new Map();
    const trendKeys = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(trendEndDate);
      d.setDate(trendEndDate.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      trendKeys.push(key);
      dailyMap.set(key, { date: key, label, income: 0, expense: 0 });
    }
    for (const tx of periodTransactions) {
      if (tx.type === "transfer") continue;
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const bucket = dailyMap.get(key);
      if (!bucket) continue;
      if (tx.type === "income") bucket.income += tx.amount;
      else bucket.expense += tx.amount;
    }
    const dailyTrend = trendKeys.map((k) => dailyMap.get(k));

    // Wallet balances
    const walletMap = new Map();
    const ensureWalletEntry = (name, type = "account", openingBalance = 0, id = name) => {
      if (!walletMap.has(name)) {
        walletMap.set(name, {
          id,
          name,
          type,
          openingBalance,
          balance: openingBalance,
          earned: 0,
          spent: 0,
          transferredIn: 0,
          transferredOut: 0,
          transactionCount: 0,
        });
      }
      return walletMap.get(name);
    };

    let totalOpeningBalance = 0;
    for (const w of registeredWallets) {
      const opening = Number(w.openingBalance ?? 0);
      totalOpeningBalance += opening;
      ensureWalletEntry(w.name, w.type, opening, w.id);
    }

    for (const tx of allTransactions) {
      const walletName = tx.wallet?.name || "Cash";
      const entry = ensureWalletEntry(walletName);
      entry.transactionCount += 1;

      const time = new Date(tx.createdAt).getTime();
      const inPeriod = (!start || time >= start.getTime()) && (!end || time <= end.getTime());

      if (tx.type === "transfer") {
        entry.balance -= tx.amount;
        if (inPeriod) entry.transferredOut += tx.amount;

        const destName = tx.toWallet?.name;
        if (destName) {
          const destEntry = ensureWalletEntry(destName);
          destEntry.transactionCount += 1;
          destEntry.balance += tx.amount;
          if (inPeriod) destEntry.transferredIn += tx.amount;
        }
      } else if (tx.type === "income") {
        entry.balance += tx.amount;
        if (inPeriod) entry.earned += tx.amount;
      } else {
        entry.balance -= tx.amount;
        if (inPeriod) entry.spent += tx.amount;
      }
    }

    const wallets = Array.from(walletMap.values()).sort(
      (a, b) => Math.abs(b.balance) - Math.abs(a.balance)
    );

    const availableBalance = totalOpeningBalance + allTimeSummary.balance;

    // Category breakdown
    const budgetLookup = new Map(
      registeredCategories.map((c) => [c.name, { id: c.id, monthlyBudget: c.monthlyBudget, icon: c.icon }])
    );
    const categoryTotals = new Map();
    let totalExpense = 0;

    for (const tx of periodTransactions) {
      if (tx.type !== "expense") continue;
      const catName = tx.category?.name || "Uncategorized";
      categoryTotals.set(catName, (categoryTotals.get(catName) || 0) + tx.amount);
      totalExpense += tx.amount;
    }

    const categoryBreakdown = Array.from(categoryTotals.entries())
      .map(([name, spent]) => {
        const meta = budgetLookup.get(name);
        const budget = meta?.monthlyBudget || 0;
        const sharePercent = totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0;
        const budgetPercent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : sharePercent;
        return {
          id: meta?.id || name,
          name,
          spent,
          budget,
          icon: meta?.icon || null,
          sharePercent,
          budgetPercent,
          overBudget: budget > 0 && spent > budget,
        };
      })
      .sort((a, b) => b.spent - a.spent);

    // Compute splits & merchant intelligence
    const splitsSummary = this.computeSplitsSummary(allTransactions);
    const { topMerchants, microSpendSummary } = this.computeMerchantIntelligence(
      periodTransactions,
      currentSummary.expense
    );

    return {
      period,
      salaryCycle: bounds.isSalaryCycle
        ? {
            salaryAmount: bounds.salaryAmount,
            payday: bounds.payday,
            lastSalaryDate: bounds.lastSalaryDate,
            nextSalaryDate: bounds.nextSalaryDate,
            daysRemaining,
            daysElapsed,
            totalCycleDays,
          }
        : null,
      summary: {
        ...currentSummary,
        savingsRate,
        availableBalance,
        openingBalanceTotal: totalOpeningBalance,
        deltas: {
          balance: this.percentDelta(currentSummary.balance, previousSummary.balance),
          income: this.percentDelta(currentSummary.income, previousSummary.income),
          expense: this.percentDelta(currentSummary.expense, previousSummary.expense),
        },
      },
      spendingPace: {
        spendingCap,
        hasConfiguredBudgets: configuredBudgetTotal > 0,
        spent: currentSummary.expense,
        remaining: remainingBudget,
        daysElapsed,
        daysRemaining,
        dailyAllowance,
        avgDailySpend,
        projectedMonthSpend,
        utilizationPercent,
        isSalaryCycle: bounds.isSalaryCycle,
      },
      dailyTrend,
      wallets,
      categoryBreakdown,
      splitsSummary,
      merchantIntelligence: {
        topMerchants,
        microSpendSummary,
      },
    };
  }
}

