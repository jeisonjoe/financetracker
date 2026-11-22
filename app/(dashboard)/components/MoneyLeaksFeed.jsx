"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BiChevronRight,
  BiCoffee,
  BiCreditCard,
  BiError,
  BiErrorCircle,
  BiMoney,
  BiTrendingUp,
} from "react-icons/bi";
import { cFormat } from "@/app/utils/currencyFormat";

export default function MoneyLeaksFeed({
  merchantIntelligence,
  categoryBreakdown = [],
  planning,
  pace,
  currency = "INR",
}) {
  const leaks = useMemo(() => {
    const list = [];
    const totalCycleDays = (pace?.daysElapsed || 1) + (pace?.daysRemaining || 1);
    const timeElapsedPercent = Math.round(
      ((pace?.daysElapsed || 1) / Math.max(1, totalCycleDays)) * 100
    );

    // 1. Behavioral Leak Detector: Micro-Spends under ₹200
    const micro = merchantIntelligence?.microSpendSummary;
    if (micro && micro.count >= 3 && micro.totalAmount > 0) {
      const topSpot = micro.topMicroSpots?.[0];
      list.push({
        id: "micro-spends",
        type: "leak",
        severity: micro.percentOfExpenses >= 15 ? "warning" : "info",
        icon: BiCoffee,
        title: "Behavioral Leak Detector",
        headline: `Small spends under ₹200 ate ${cFormat(micro.totalAmount, {
          currency,
        })} across ${micro.count} quick payments`,
        detail: topSpot
          ? `Represents ${micro.percentOfExpenses}% of total spending this month. Largest recurring spot: ${topSpot.name} (${cFormat(topSpot.total, { currency })}).`
          : `Represents ${micro.percentOfExpenses}% of your monthly expenses across daily snacks, tea, and quick errands.`,
        actionUrl: "/dashboard/transactions",
        actionLabel: "Audit Micro-Spends",
      });
    }

    // 2. Category Pacing Overheats
    for (const cat of categoryBreakdown) {
      if (!cat.budget || cat.budget <= 0) continue;
      if (cat.overBudget) {
        list.push({
          id: `pacing-over-${cat.name}`,
          type: "pacing",
          severity: "danger",
          icon: BiErrorCircle,
          title: "Budget Exhausted",
          headline: `${cat.name} exceeded monthly cap by ${cFormat(
            cat.spent - cat.budget,
            { currency }
          )}`,
          detail: `Spent ${cFormat(cat.spent, { currency })} of ${cFormat(
            cat.budget,
            { currency }
          )} with ${pace.daysRemaining} days remaining in cycle.`,
          actionUrl: `/dashboard/categories`,
          actionLabel: "Inspect Category",
        });
      } else if (
        cat.budgetPercent > timeElapsedPercent + 15 &&
        pace.daysRemaining > 3
      ) {
        list.push({
          id: `pacing-fast-${cat.name}`,
          type: "pacing",
          severity: "warning",
          icon: BiError,
          title: "Fast Burn Warning",
          headline: `${cat.name} is pacing faster than the calendar (${cat.budgetPercent}% consumed)`,
          detail: `Day ${pace.daysElapsed} of ${totalCycleDays} (${timeElapsedPercent}% elapsed), but you have burned ${cFormat(
            cat.spent,
            { currency }
          )} of your ${cFormat(cat.budget, { currency })} cap.`,
          actionUrl: `/dashboard/categories`,
          actionLabel: "Inspect Category",
        });
      }
    }

    // 3. Upcoming Fixed Outflows (Bills due in next 10 days)
    const activeRecurring = (planning?.recurring || []).filter(
      (r) => r.is_active && r.type === "expense" && r.days_until_due <= 10
    );
    if (activeRecurring.length > 0) {
      const upcomingSum = activeRecurring.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const names = activeRecurring.slice(0, 3).map((r) => r.title || r.name).join(", ");
      list.push({
        id: "upcoming-bills",
        type: "cashflow",
        severity: upcomingSum > (pace?.remaining || 0) && (pace?.remaining || 0) > 0 ? "warning" : "info",
        icon: BiCreditCard,
        title: "Upcoming Outflow Forecast",
        headline: `${cFormat(upcomingSum, {
          currency,
        })} in fixed commitments due in the next 10 days`,
        detail: `Upcoming scheduled items: ${names}${
          activeRecurring.length > 3 ? ` +${activeRecurring.length - 3} more` : ""
        }. Ensure funds stay reserved.`,
        actionUrl: "/dashboard/planning",
        actionLabel: "View Recurring Bills",
      });
    }

    // 4. Peer Debts Owed To You
    const totalLent = planning?.debtsSummary?.totalLent || 0;
    const openDebts = planning?.debtsSummary?.openDebtsCount || 0;
    if (totalLent > 0) {
      list.push({
        id: "peer-debts",
        type: "debt",
        severity: "info",
        icon: BiMoney,
        title: "Money Lent to Friends",
        headline: `${cFormat(totalLent, {
          currency,
        })} lent to friends pending return`,
        detail: `${openDebts} ${openDebts === 1 ? "friend has" : "friends have"} active outstanding balances with you.`,
        actionUrl: "/dashboard/debts",
        actionLabel: "Open Debts Ledger",
      });
    }

    return list.slice(0, 4);
  }, [merchantIntelligence, categoryBreakdown, planning, pace, currency]);

  if (leaks.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-normal text-ink-primary">
            Automated Money Leaks &amp; Anomalies
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-tint text-ink-muted">
            {leaks.length} active {leaks.length === 1 ? "signal" : "signals"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {leaks.map((item) => {
          const Icon = item.icon;
          const isDanger = item.severity === "danger";
          const isWarning = item.severity === "warning";

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-surface border transition-colors flex flex-col justify-between gap-3 ${
                isDanger
                  ? "border-red-500/25 bg-red-500/[0.03]"
                  : isWarning
                  ? "border-amber-500/25 bg-amber-500/[0.03]"
                  : "border-line-subtle hover:border-line"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDanger
                      ? "bg-red-500/10 border-red-500/20 text-red-800"
                      : isWarning
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-800"
                      : "bg-tint border-line-subtle text-ink-secondary"
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-ink-subtle">
                      {item.title}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-medium text-ink-primary leading-snug">
                    {item.headline}
                  </h4>
                  <p className="text-xs text-ink-subtle leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-line-faint">
                <Link
                  href={item.actionUrl}
                  className="text-xs text-ink-subtle hover:text-ink-primary inline-flex items-center gap-1 transition-colors"
                >
                  <span>{item.actionLabel}</span>
                  <BiChevronRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
