/**
 * Computes date ranges and aggregated financial analytics across periods,
 * wallets, and spending categories.
 */
export class AnalyticsService {
  constructor(transactionRepo, categoryRepo, walletRepo) {
    this.transactionRepo = transactionRepo;
    this.categoryRepo = categoryRepo;
    this.walletRepo = walletRepo;
  }

  getPeriodBounds(period = "this_month") {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (period === "last_month") {
      return {
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
      };
    }

    if (period === "last_3_months") {
      return {
        start: new Date(year, month - 2, 1, 0, 0, 0, 0),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    }

    if (period === "all_time") {
      return { start: null, end: null };
    }

    return {
      start: new Date(year, month, 1, 0, 0, 0, 0),
      end: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  summarizeTotals(transactions) {
    let income = 0;
    let expense = 0;
    let transfers = 0;
    for (const tx of transactions) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "transfer") transfers += tx.amount;
      else expense += tx.amount;
    }
    return {
      income,
      expense,
      transfers,
      balance: income - expense,
      count: transactions.length,
    };
  }

  percentDelta(current, previous) {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
  }

  async getDashboardOverview(userId, period = "this_month") {
    const { start, end } = this.getPeriodBounds(period);
    const prevBounds =
      period === "last_month"
        ? {
            start: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1, 0, 0, 0, 0),
            end: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 0, 23, 59, 59, 999),
          }
        : this.getPeriodBounds("last_month");

    const [allTransactions, registeredCategories, registeredWallets] = await Promise.all([
      this.transactionRepo.findInDateRange(userId, null, null, null),
      this.categoryRepo.findAllForUser(userId),
      this.walletRepo.findAllForUser(userId),
    ]);

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

    // Monthly spending pace & burn rate calculation
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = Math.max(1, now.getDate());
    const daysRemaining = Math.max(1, lastDayOfMonth - now.getDate() + 1);
    const configuredBudgetTotal = registeredCategories
      .filter((c) => c.type !== "income" && c.name?.trim().toLowerCase() !== "transfer")
      .reduce((sum, c) => sum + (Number(c.monthlyBudget) || 0), 0);
    const spendingCap =
      configuredBudgetTotal > 0 ? configuredBudgetTotal : currentSummary.income;
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
    const projectedMonthSpend = Math.round(avgDailySpend * lastDayOfMonth);
    const savingsRate =
      currentSummary.income > 0
        ? Math.round(((currentSummary.income - currentSummary.expense) / currentSummary.income) * 100)
        : 0;

    // 14-day daily cashflow trend anchored to the end of the selected period (or today)
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

    // Wallet analytics: opening balance + all-time flows + selected period earned/spent/transfers
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

    // Category spending & budget analysis for the selected period
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

    return {
      period,
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
      },
      dailyTrend,
      wallets,
      categoryBreakdown,
    };
  }
}

