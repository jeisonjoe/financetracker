"use client";

import Link from "next/link";
import { cFormat, formatAmountParts } from "@/app/utils/currencyFormat";
import { useAnalytics, usePlanningOverview } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import AddTransactionSidebar from "../components/AddTransactionSidebar";
import StreamsWidget from "../components/StreamsWidget";
import TransactionsWidget from "../components/TransactionsWidget";

export default function Page() {
  const { data, isLoading } = useAnalytics("this_month");
  const { data: planning } = usePlanningOverview();
  const { user } = useAuth();
  const { open } = useRhsSidebarStore();
  const currency = user?.currency || "INR";

  const summary = data?.summary || {
    availableBalance: 0,
    balance: 0,
    income: 0,
    expense: 0,
  };
  const pace = data?.spendingPace || {
    spendingCap: 0,
    hasConfiguredBudgets: false,
    spent: 0,
    remaining: 0,
    daysRemaining: 1,
    dailyAllowance: 0,
    utilizationPercent: 0,
  };

  const heroParts = formatAmountParts(summary.availableBalance, currency);

  let paceCaption = "Add monthly budgets or income to see your daily spending pace.";
  if (pace.spendingCap > 0) {
    if (pace.remaining >= 0) {
      paceCaption = `You can keep spending ${cFormat(pace.dailyAllowance, {
        currency,
        decimals: 2,
      })} for ${pace.daysRemaining} more ${
        pace.daysRemaining === 1 ? "day" : "days"
      }`;
    } else {
      paceCaption = `You’ve exceeded your monthly plan by ${cFormat(
        Math.abs(pace.remaining),
        { currency }
      )} with ${pace.daysRemaining} ${
        pace.daysRemaining === 1 ? "day" : "days"
      } left`;
    }
  } else if (pace.spent > 0) {
    paceCaption = `Spent ${cFormat(pace.spent, { currency })} so far this month`;
  }

  return (
    <div className="flex flex-col justify-between gap-10 grow">
      {/* Top Hero Row */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline text-zinc-200">
            <span className="text-4xl sm:text-5xl lg:text-[56px] font-light leading-none">
              {heroParts.sign}
              {heroParts.symbol}
              {isLoading ? "..." : heroParts.whole}
            </span>
            <span className="text-sm sm:text-base font-light text-zinc-500 ml-1">
              .{heroParts.decimal}
            </span>
          </div>
          <span className="text-xs sm:text-sm text-zinc-500 font-normal">
            Available Balance
          </span>
        </div>

        <button
          type="button"
          onClick={() => open(AddTransactionSidebar)}
          className="px-5 py-2.5 rounded-full bg-surface-elevated hover:bg-surface-hover border border-white/[0.07] text-zinc-200 text-sm font-normal cursor-pointer transition-colors"
        >
          Add Transaction
        </button>
      </div>

      {/* Monthly Spending Pace */}
      <div className="flex flex-col gap-3 max-w-2xl">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-light text-zinc-300">
            Monthly Spending
          </h2>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>
              Earned{" "}
              <span className="text-green-100 font-medium">
                +{cFormat(summary.income, { currency })}
              </span>
            </span>
            <span>
              Spent{" "}
              <span className="text-red-100 font-medium">
                -{cFormat(summary.expense, { currency })}
              </span>
            </span>
          </div>
        </div>

        <div className="w-full max-w-md h-3 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            style={{ width: `${Math.min(100, pace.utilizationPercent)}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              pace.remaining < 0 && pace.spendingCap > 0
                ? "bg-red-100"
                : "bg-zinc-400"
            }`}
          />
        </div>

        <p className="text-xs sm:text-sm text-zinc-500 font-normal">
          {paceCaption}
        </p>
      </div>

      {/* Bottom Section: Compact Recent Transactions + Streams Card Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-2">
        <div className="lg:col-span-7 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-base font-normal text-zinc-300">
              Recent Transactions
            </span>
            <Link
              href="/dashboard/transactions"
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="h-[290px]">
            <TransactionsWidget compact={true} pageSize={8} />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-end">
          <StreamsWidget />
        </div>
      </div>

      {/* Fund Plan, Goals & Upcoming Bills Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <Link
          href="/dashboard/planning"
          className="bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between gap-2 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Free to Spend</span>
            <span>Cashflow Plan →</span>
          </div>
          <div
            className={`text-xl font-light ${
              (planning?.cashflow?.freeToSpend ?? 0) < 0
                ? "text-red-100"
                : "text-zinc-100"
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
          <div className="text-xs text-zinc-500 tabular-nums">
            Reserved:{" "}
            {cFormat(planning?.cashflow?.totalReserved ?? 0, { currency })}
          </div>
        </Link>

        <Link
          href="/dashboard/planning?tab=goals"
          className="bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between gap-2 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Savings Goals</span>
            <span>
              {planning?.goalsSummary?.activeCount ?? 0} active
            </span>
          </div>
          <div className="text-xl font-light text-zinc-100 tabular-nums">
            <AnimatedNumber
              value={planning?.goalsSummary?.totalSaved ?? 0}
              currency={currency}
            />
            <span className="text-xs text-zinc-500 ml-1.5">
              / {cFormat(planning?.goalsSummary?.totalTarget ?? 0, { currency })}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              style={{
                width: `${planning?.goalsSummary?.overallProgressPercent ?? 0}%`,
              }}
              className="h-full rounded-full bg-green-100 transition-all duration-700 ease-out"
            />
          </div>
        </Link>

        <Link
          href="/dashboard/planning?tab=recurring"
          className="bg-surface-elevated/40 hover:bg-surface-elevated/70 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between gap-2 transition-all duration-200 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Upcoming Bills</span>
            <span
              className={
                (planning?.recurringSummary?.overdueCount ?? 0) > 0
                  ? "text-red-100"
                  : ""
              }
            >
              {(planning?.recurringSummary?.overdueCount ?? 0) > 0
                ? `${planning.recurringSummary.overdueCount} overdue`
                : `${planning?.recurringSummary?.dueSoonCount ?? 0} due soon`}
            </span>
          </div>
          <div className="text-xl font-light text-zinc-100">
            <AnimatedNumber
              value={planning?.recurringSummary?.dueThisMonthExpense ?? 0}
              currency={currency}
            />
          </div>
          <div className="text-xs text-zinc-500 tabular-nums">
            Monthly recurring:{" "}
            {cFormat(planning?.recurringSummary?.monthlyExpense ?? 0, {
              currency,
            })}
          </div>
        </Link>
      </div>
    </div>
  );
}
