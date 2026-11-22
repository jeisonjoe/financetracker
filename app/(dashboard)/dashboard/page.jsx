"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BiBot, BiCheckCircle, BiPlus, BiTrendingUp } from "react-icons/bi";
import { toast } from "sonner";
import { cFormat, formatAmountParts, getCurrencySymbol } from "@/app/utils/currencyFormat";
import {
  useAnalytics,
  usePlanningMutations,
  usePlanningOverview,
} from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import Modal from "@/app/components/Modal";
import RenderIcon from "@/app/components/RenderIcon";
import { useGlobalPeriod } from "@/app/store/PeriodStore";
import CashflowBarChart from "@/app/components/charts/CashflowBarChart";
import SpendingTrendLineChart from "@/app/components/charts/SpendingTrendLineChart";
import CategoryDoughnutChart from "@/app/components/charts/CategoryDoughnutChart";
import StreamsWidget from "../components/StreamsWidget";
import TransactionsWidget from "../components/TransactionsWidget";

const QUICK_GOAL_CHIPS = [500, 1000, 5000];

const PERIOD_LABELS = {
  this_month: "This Month",
  salary_cycle: "Salary Cycle",
  last_month: "Last Month",
  last_3_months: "Last 3 Months",
  all_time: "All Time",
};

function getPeriodLabel(period) {
  if (!period) return "This Month";
  if (period.startsWith("custom:")) {
    const [start, end] = period.replace("custom:", "").split("_");
    return `${start} to ${end}`;
  }
  return PERIOD_LABELS[period] || "This Period";
}

export default function Page() {
  const { period } = useGlobalPeriod();
  const [hoveredDay, setHoveredDay] = useState(null);
  const [trendChartType, setTrendChartType] = useState("bars"); // "bars" | "cumulative"
  const { data, isLoading } = useAnalytics(period);
  const { data: planning } = usePlanningOverview();
  const { updateGoal, processRecurring } = usePlanningMutations();
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const symbol = getCurrencySymbol(currency);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [contribAmount, setContribAmount] = useState("");
  const [cachedInsight, setCachedInsight] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        `fintrack_ai_insights_v1:${user?.id || "anon"}:${period}`
      );
      setCachedInsight(raw ? JSON.parse(raw)?.insights || null : null);
    } catch {
      setCachedInsight(null);
    }
  }, [user?.id, period]);

  const summary = data?.summary || {
    availableBalance: 0,
    balance: 0,
    income: 0,
    expense: 0,
    savingsRate: 0,
    count: 0,
    deltas: { balance: 0, income: 0, expense: 0 },
  };

  const pace = data?.spendingPace || {
    spendingCap: 0,
    hasConfiguredBudgets: false,
    spent: 0,
    remaining: 0,
    daysElapsed: 1,
    daysRemaining: 1,
    dailyAllowance: 0,
    avgDailySpend: 0,
    projectedMonthSpend: 0,
    utilizationPercent: 0,
  };

  const dailyTrend = data?.dailyTrend || [];
  const wallets = data?.wallets || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const overBudgetCount = categoryBreakdown.filter((c) => c.overBudget).length;

  const maxTrendValue = useMemo(() => {
    let max = 0;
    for (const day of dailyTrend) {
      if (day.income > max) max = day.income;
      if (day.expense > max) max = day.expense;
    }
    return max;
  }, [dailyTrend]);

  const heroParts = formatAmountParts(summary.availableBalance, currency);

  const topActiveGoal = useMemo(() => {
    const active = (planning?.goals || []).filter((g) => g.status === "active");
    return active[0] || null;
  }, [planning?.goals]);

  const nextDueBill = useMemo(() => {
    const activeExpenses = (planning?.recurring || [])
      .filter((r) => r.is_active && r.type === "expense")
      .sort((a, b) => a.days_until_due - b.days_until_due);
    return activeExpenses[0] || null;
  }, [planning?.recurring]);

  let paceCaption = "Add monthly budgets or income to see your daily spending pace.";
  if (pace.spendingCap > 0) {
    if (pace.remaining >= 0) {
      paceCaption = `Safe to spend ${cFormat(pace.dailyAllowance, {
        currency,
        decimals: 0,
      })}/day for ${pace.daysRemaining} more ${
        pace.daysRemaining === 1 ? "day" : "days"
      }`;
    } else {
      paceCaption = `Exceeded monthly cap by ${cFormat(Math.abs(pace.remaining), {
        currency,
      })} with ${pace.daysRemaining} ${
        pace.daysRemaining === 1 ? "day" : "days"
      } left`;
    }
  } else if (pace.spent > 0) {
    paceCaption = `Spent ${cFormat(pace.spent, { currency })} in ${
      getPeriodLabel(period)?.toLowerCase() || "this period"
    }`;
  }

  const handleQuickContribute = async (e) => {
    e.preventDefault();
    if (!topActiveGoal) return;
    const val = Number(contribAmount);
    if (!Number.isFinite(val) || val <= 0) {
      toast.error("Enter a valid contribution amount");
      return;
    }
    try {
      await updateGoal.mutateAsync({
        id: topActiveGoal.id,
        payload: { adjust_amount: val },
      });
      toast.success(
        `Added ${cFormat(val, { currency })} to ${topActiveGoal.name}`
      );
      setGoalModalOpen(false);
      setContribAmount("");
    } catch (err) {
      toast.error(err.message || "Failed to update goal");
    }
  };

  const handleQuickMarkPaid = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nextDueBill || processRecurring.isPending) return;
    try {
      await processRecurring.mutateAsync({
        id: nextDueBill.id,
        action: "log",
      });
      toast.success(`Logged "${nextDueBill.title}"`);
    } catch (err) {
      toast.error(err.message || "Failed to log recurring bill");
    }
  };

  const showDeltas = period === "this_month" || period === "last_month";
  const incomeDelta = summary.deltas?.income ?? 0;
  const expenseDelta = summary.deltas?.expense ?? 0;
  const netCashflow = summary.balance ?? 0;

  return (
    <div className="flex flex-col gap-6 pb-8 grow">
      {/* Top Hero Row + Period Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline text-ink-primary tabular-nums">
            <span className="text-4xl sm:text-5xl lg:text-[52px] font-light leading-none">
              {heroParts.sign}
              {heroParts.symbol}
              {isLoading ? "..." : heroParts.whole}
            </span>
            <span className="text-sm sm:text-base font-light text-ink-subtle ml-1">
              .{heroParts.decimal}
            </span>
          </div>
          <span className="text-xs sm:text-sm text-ink-subtle font-normal">
            Available balance across {wallets.length}{" "}
            {wallets.length === 1 ? "wallet" : "wallets"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {overBudgetCount > 0 && (
            <Link
              href="/dashboard/budgets"
              className="px-3.5 py-2 rounded-full bg-red-10 text-red-100 text-xs font-medium transition-colors"
            >
              {overBudgetCount}{" "}
              {overBudgetCount === 1 ? "category over cap" : "categories over cap"}
            </Link>
          )}
        </div>
      </div>

      {/* 4-Metric Financial KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-4 flex flex-col gap-1.5">
          <span className="text-xs text-ink-subtle">
            Income ({getPeriodLabel(period)})
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
            <span className="text-xl font-normal text-green-100">
              +{cFormat(summary.income, { currency })}
            </span>
            {showDeltas && incomeDelta !== 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-tint text-ink-muted">
                {incomeDelta > 0 ? `+${incomeDelta}%` : `${incomeDelta}%`} vs last mo
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-4 flex flex-col gap-1.5">
          <span className="text-xs text-ink-subtle">
            Expenses ({getPeriodLabel(period)})
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
            <span className="text-xl font-normal text-red-100">
              -{cFormat(summary.expense, { currency })}
            </span>
            {showDeltas && expenseDelta !== 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-tint text-ink-muted">
                {expenseDelta > 0 ? `+${expenseDelta}%` : `${expenseDelta}%`} vs last mo
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-4 flex flex-col gap-1.5">
          <span className="text-xs text-ink-subtle">Net Cashflow</span>
          <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
            <span
              className={`text-xl font-normal ${
                netCashflow >= 0 ? "text-ink-primary" : "text-red-100"
              }`}
            >
              {netCashflow >= 0 ? "+" : "-"}
              {cFormat(Math.abs(netCashflow), { currency })}
            </span>
            {summary.income > 0 && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  summary.savingsRate >= 20
                    ? "bg-green-10 text-green-100"
                    : "bg-tint text-ink-muted"
                }`}
              >
                {summary.savingsRate}% saved
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-4 flex flex-col gap-1.5">
          <span className="text-xs text-ink-subtle">
            {pace.spendingCap > 0 ? "Safe Daily Limit" : "Avg Daily Spend"}
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2 tabular-nums">
            <span className="text-xl font-normal text-ink-primary">
              {pace.spendingCap > 0
                ? `${cFormat(pace.dailyAllowance, { currency, decimals: 0 })}/d`
                : `${cFormat(pace.avgDailySpend, { currency, decimals: 0 })}/d`}
            </span>
            <span className="text-[11px] text-ink-subtle">
              {pace.spendingCap > 0
                ? `Avg ${cFormat(pace.avgDailySpend, { currency, decimals: 0 })}/d`
                : `${summary.count} txns`}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Insights Row: 14-Day Cashflow & Pace + Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Cashflow Pulse & Spending Pace */}
        <div className="lg:col-span-7 bg-surface-elevated/45 border border-line-subtle rounded-2xl p-5 flex flex-col justify-between gap-5">
          {/* Spending Pace Bar */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-normal text-ink-secondary">
                  Spending Pace & Cashflow Pulse
                </h3>
              </div>
              {pace.spendingCap > 0 ? (
                <span className="text-xs text-ink-subtle tabular-nums">
                  {pace.utilizationPercent}% of{" "}
                  {cFormat(pace.spendingCap, { currency })}{" "}
                  {pace.hasConfiguredBudgets ? "budget cap" : "income"}
                </span>
              ) : (
                <Link
                  href="/dashboard/budgets"
                  className="text-xs text-ink-muted hover:text-ink-primary transition-colors"
                >
                  Set budget caps →
                </Link>
              )}
            </div>

            <div className="w-full h-2.5 rounded-full bg-tint overflow-hidden">
              <div
                style={{ width: `${Math.min(100, pace.utilizationPercent)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  pace.remaining < 0 && pace.spendingCap > 0
                    ? "bg-red-100"
                    : pace.utilizationPercent >= 80
                    ? "bg-accent"
                    : "bg-green-100"
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-subtle tabular-nums">
              <span>{paceCaption}</span>
              {period === "this_month" && pace.avgDailySpend > 0 && (
                <span>
                  Projected month-end:{" "}
                  {cFormat(pace.projectedMonthSpend, { currency })}
                </span>
              )}
            </div>
          </div>

          {/* 14-Day Daily Cashflow Chart */}
          <div className="flex flex-col gap-3 pt-3 border-t border-line-faint">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-ink-subtle flex items-center gap-1.5">
                <BiTrendingUp size={15} />
                <span>
                  {hoveredDay
                    ? `${hoveredDay.label}: +${cFormat(hoveredDay.income, {
                        currency,
                      })} / -${cFormat(hoveredDay.expense, { currency })}`
                    : "Last 14 days daily activity"}
                </span>
              </span>
              <div className="flex items-center gap-2 sm:gap-3 text-ink-subtle">
                <div className="flex items-center bg-surface border border-line-subtle p-0.5 rounded-full">
                  <button
                    type="button"
                    onClick={() => setTrendChartType("bars")}
                    className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors ${
                      trendChartType === "bars"
                        ? "bg-tint-active text-ink-primary font-medium"
                        : "text-ink-subtle hover:text-ink-body"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendChartType("cumulative")}
                    className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors ${
                      trendChartType === "cumulative"
                        ? "bg-tint-active text-ink-primary font-medium"
                        : "text-ink-subtle hover:text-ink-body"
                    }`}
                  >
                    Cumulative
                  </button>
                </div>
                {trendChartType === "bars" && (
                  <div className="hidden sm:flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-100" />
                      Income
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      Expense
                    </span>
                  </div>
                )}
              </div>
            </div>

            {maxTrendValue === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-ink-faint rounded-xl bg-surface/60 border border-line-faint">
                No income or expenses recorded in this window yet.
              </div>
            ) : trendChartType === "bars" ? (
              <CashflowBarChart
                dailyTrend={dailyTrend}
                currency={currency}
                height={140}
                onHoverDay={setHoveredDay}
              />
            ) : (
              <SpendingTrendLineChart
                dailyTrend={dailyTrend}
                currency={currency}
                height={140}
              />
            )}
          </div>
        </div>

        {/* Right: Top Spending Categories & Budget Watch */}
        <div className="lg:col-span-5 bg-surface-elevated/45 border border-line-subtle rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-normal text-ink-secondary">
              Top Spending Categories
            </h3>
            <Link
              href="/dashboard/budgets"
              className="text-xs text-ink-subtle hover:text-ink-primary transition-colors"
            >
              Budgets →
            </Link>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-10 text-center flex flex-col gap-1.5 my-auto">
              <span className="text-sm text-ink-subtle">
                No category spending in {getPeriodLabel(period)?.toLowerCase()}
              </span>
              <span className="text-xs text-ink-faint">
                Click Add Transaction above to log an expense and track category mix.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <CategoryDoughnutChart
                categories={categoryBreakdown}
                currency={currency}
                height={145}
                cutout="74%"
              />

              <div className="flex flex-col gap-2.5">
                {categoryBreakdown.slice(0, 4).map((cat) => {
                  const hasBudget = cat.budget > 0;
                  const fillPct = hasBudget ? cat.budgetPercent : cat.sharePercent;
                  const barColor = cat.overBudget
                    ? "bg-red-100"
                    : hasBudget && cat.budgetPercent >= 80
                    ? "bg-accent"
                    : "bg-ink-muted";

                  return (
                    <Link
                      key={cat.name}
                      href={`/dashboard/transactions?category=${encodeURIComponent(cat.name)}`}
                      className="group flex flex-col gap-1.5 p-1.5 -mx-1.5 rounded-xl hover:bg-surface-hover/70 transition-colors cursor-pointer"
                      title={`View ${cat.name} transactions`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <RenderIcon
                            icon={cat.icon}
                            name={cat.name}
                            props={{
                              className:
                                "text-sm text-ink-muted shrink-0 group-hover:text-ink-secondary transition-colors",
                            }}
                          />
                          <span className="text-ink-body group-hover:text-ink-primary font-normal transition-colors truncate">
                            {cat.name}
                          </span>
                          {cat.overBudget && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-10 text-red-100 shrink-0">
                              Over
                            </span>
                          )}
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <span className="font-medium text-ink-secondary group-hover:text-ink-primary transition-colors">
                            {cFormat(cat.spent, { currency })}
                          </span>
                          <span className="text-xs text-ink-subtle ml-1">
                            {hasBudget
                              ? `/ ${cFormat(cat.budget, { currency })}`
                              : `(${cat.sharePercent}%)`}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1 rounded-full bg-tint overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(100, fillPct)}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle Section: Recent Transactions + Wallets Card Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-base font-normal text-ink-body">
              Recent Transactions
            </span>
            <Link
              href="/dashboard/transactions"
              className="text-xs text-ink-subtle hover:text-ink-secondary transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="h-[285px]">
            <Suspense fallback={null}>
              <TransactionsWidget compact={true} pageSize={8} />
            </Suspense>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col min-w-0">
          <StreamsWidget />
        </div>
      </div>

      {/* Actionable Planning Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Free to Spend Card */}
        <Link
          href="/dashboard/planning"
          className="bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-line-subtle hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-xs text-ink-subtle">
            <span>Free to Spend</span>
            <span>Cashflow Plan →</span>
          </div>
          <div
            className={`text-xl font-light tabular-nums ${
              (planning?.cashflow?.freeToSpend ?? 0) < 0
                ? "text-red-100"
                : "text-ink-primary"
            }`}
          >
            {planning?.cashflow?.plannedIncome > 0 ||
            planning?.cashflow?.actualIncomeThisMonth > 0 ? (
              <AnimatedNumber
                value={planning.cashflow.freeToSpend}
                currency={currency}
              />
            ) : (
              "Set income plan"
            )}
          </div>
          <div className="text-xs text-ink-subtle tabular-nums">
            Reserved:{" "}
            {cFormat(planning?.cashflow?.totalReserved ?? 0, { currency })}
          </div>
        </Link>

        {/* Actionable Savings Goals Card */}
        <div className="bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-line-subtle hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between gap-2.5 transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-ink-subtle">
            <Link
              href="/dashboard/planning?tab=goals"
              className="hover:text-ink-primary transition-colors"
            >
              Savings Goals →
            </Link>
            {topActiveGoal ? (
              <button
                type="button"
                onClick={() => {
                  setContribAmount("");
                  setGoalModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tint hover:bg-tint-active text-ink-primary text-[11px] font-medium cursor-pointer transition-colors"
              >
                <BiPlus size={13} />
                Contribute
              </button>
            ) : (
              <span>{planning?.goalsSummary?.activeCount ?? 0} active</span>
            )}
          </div>

          <Link
            href="/dashboard/planning?tab=goals"
            className="flex flex-col gap-2"
          >
            <div className="text-xl font-light text-ink-primary tabular-nums">
              <AnimatedNumber
                value={planning?.goalsSummary?.totalSaved ?? 0}
                currency={currency}
              />
              <span className="text-xs text-ink-subtle ml-1.5">
                / {cFormat(planning?.goalsSummary?.totalTarget ?? 0, { currency })}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-tint overflow-hidden">
              <div
                style={{
                  width: `${planning?.goalsSummary?.overallProgressPercent ?? 0}%`,
                }}
                className="h-full rounded-full bg-green-100 transition-all duration-700 ease-out"
              />
            </div>
            {topActiveGoal && (
              <div className="text-xs text-ink-subtle truncate">
                Top goal: {topActiveGoal.name} ({topActiveGoal.progress_percent}%)
              </div>
            )}
          </Link>
        </div>

        {/* Actionable Upcoming Bills Card */}
        <div className="bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-line-subtle hover:border-line-strong rounded-2xl p-4 flex flex-col justify-between gap-2.5 transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-ink-subtle">
            <Link
              href="/dashboard/planning?tab=recurring"
              className="hover:text-ink-primary transition-colors"
            >
              Upcoming Bills →
            </Link>
            <span
              className={
                (planning?.recurringSummary?.overdueCount ?? 0) > 0
                  ? "text-red-100 font-medium"
                  : ""
              }
            >
              {(planning?.recurringSummary?.overdueCount ?? 0) > 0
                ? `${planning.recurringSummary.overdueCount} overdue`
                : `${planning?.recurringSummary?.dueSoonCount ?? 0} due soon`}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3">
            <Link
              href="/dashboard/planning?tab=recurring"
              className="flex flex-col min-w-0"
            >
              <div className="text-xl font-light text-ink-primary tabular-nums">
                <AnimatedNumber
                  value={planning?.recurringSummary?.dueThisMonthExpense ?? 0}
                  currency={currency}
                />
              </div>
              <div className="text-xs text-ink-subtle truncate mt-1">
                {nextDueBill
                  ? `Next: ${nextDueBill.title} (${
                      nextDueBill.days_until_due < 0
                        ? `${Math.abs(nextDueBill.days_until_due)}d overdue`
                        : nextDueBill.days_until_due === 0
                        ? "due today"
                        : `in ${nextDueBill.days_until_due}d`
                    })`
                  : `Monthly recurring: ${cFormat(
                      planning?.recurringSummary?.monthlyExpense ?? 0,
                      { currency }
                    )}`}
              </div>
            </Link>

            {nextDueBill && nextDueBill.days_until_due <= 7 && (
              <button
                type="button"
                onClick={handleQuickMarkPaid}
                disabled={processRecurring.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-cta hover:bg-cta-hover text-cta-ink text-xs font-medium shrink-0 cursor-pointer transition-colors disabled:opacity-60"
              >
                <BiCheckCircle size={14} />
                Mark Paid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Highlight Strip */}
      <div className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-tint flex items-center justify-center text-ink-secondary shrink-0">
            <BiBot size={19} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink-primary">
                {cachedInsight
                  ? `AI Financial Health: ${cachedInsight.healthScore}/100 (${cachedInsight.healthLabel})`
                  : "AI Spend Analysis & Statement Importer"}
              </span>
            </div>
            <p className="text-xs text-ink-subtle mt-0.5 truncate">
              {cachedInsight
                ? cachedInsight.headline
                : "Upload PDF, CSV, or Excel bank statements or generate AI spending & usage trend insights."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/import"
            className="px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs text-ink-body transition-colors"
          >
            Import Statement
          </Link>
          <Link
            href="/dashboard/insights"
            className="px-4 py-2 rounded-full bg-cta hover:bg-cta-hover text-cta-ink text-xs font-medium transition-colors"
          >
            {cachedInsight ? "View Full Analysis →" : "Analyze Trends →"}
          </Link>
        </div>
      </div>

      {/* Quick Goal Contribution Modal */}
      <Modal
        isOpen={goalModalOpen && Boolean(topActiveGoal)}
        onClose={() => setGoalModalOpen(false)}
        title={`Contribute to ${topActiveGoal?.name || "Goal"}`}
        subtitle={
          topActiveGoal
            ? `${cFormat(topActiveGoal.current_amount, { currency })} saved of ${cFormat(
                topActiveGoal.target_amount,
                { currency }
              )}`
            : ""
        }
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleQuickContribute} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_GOAL_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setContribAmount(String(chip))}
                className="px-3 py-1.5 rounded-full bg-surface-elevated hover:bg-surface-hover border border-line-subtle text-xs text-ink-secondary cursor-pointer transition-colors tabular-nums"
              >
                +{symbol}
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-surface-elevated border border-line rounded-xl px-4 py-2.5 gap-2">
            <span className="text-sm text-ink-muted">{symbol}</span>
            <input
              type="number"
              placeholder="Enter amount"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateGoal.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-colors disabled:opacity-60"
            >
              {updateGoal.isPending ? "Saving..." : "Add Funds"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
