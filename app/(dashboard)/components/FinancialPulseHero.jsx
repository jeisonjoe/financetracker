"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BiCalculator,
  BiCheckCircle,
  BiErrorCircle,
  BiInfoCircle,
  BiTrendingUp,
} from "react-icons/bi";
import { cFormat, formatAmountParts } from "@/app/utils/currencyFormat";

export default function FinancialPulseHero({
  summary,
  pace,
  planning,
  wallets = [],
  currency = "INR",
  isLoading = false,
  onOpenAffordModal,
}) {
  const heroParts = useMemo(
    () => formatAmountParts(summary?.availableBalance ?? 0, currency),
    [summary?.availableBalance, currency]
  );

  const totalCycleDays = (pace?.daysElapsed || 1) + (pace?.daysRemaining || 1);
  const timeElapsedPercent = Math.round(
    ((pace?.daysElapsed || 1) / Math.max(1, totalCycleDays)) * 100
  );

  const {
    statusBadge,
    statusText,
    badgeColor,
    projectedMonthEnd,
    dailySafeText,
  } = useMemo(() => {
    const daysRemaining = pace?.daysRemaining ?? 1;
    const remainingCap = pace?.remaining ?? 0;
    const dailyAllowance = pace?.dailyAllowance ?? 0;
    const availableBalance = summary?.availableBalance ?? 0;
    const avgDailySpend = pace?.avgDailySpend ?? 0;

    // Projected month-end liquid balance
    const projectedEnd = Math.round(
      availableBalance - avgDailySpend * daysRemaining
    );

    let badge = "On Track";
    let text = "";
    let color = "bg-emerald-500/10 text-emerald-800 border-emerald-500/20";

    if (pace?.spendingCap > 0) {
      if (remainingCap < 0) {
        badge = "Cap Exceeded";
        color = "bg-red-500/10 text-red-800 border-red-500/20";
        text = `Over monthly budget by ${cFormat(Math.abs(remainingCap), {
          currency,
        })} with ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`;
      } else if (
        pace?.utilizationPercent > timeElapsedPercent + 12 &&
        daysRemaining > 3
      ) {
        badge = "Fast Pace";
        color = "bg-amber-500/10 text-amber-800 border-amber-500/20";
        text = `Used ${pace.utilizationPercent}% of budget on day ${pace.daysElapsed} (${timeElapsedPercent}% of cycle)`;
      } else {
        badge = "On Track";
        color = "bg-emerald-500/10 text-emerald-800 border-emerald-500/20";
        text = `${timeElapsedPercent}% of cycle elapsed · healthy discretionary burn`;
      }
    } else if (pace?.spent > 0) {
      badge = "Active Spend";
      color = "bg-tint text-ink-muted border-line-subtle";
      text = `Burning ~${cFormat(avgDailySpend, {
        currency,
        decimals: 0,
      })}/day across ${wallets.length} accounts`;
    }

    const safeRunway =
      dailyAllowance > 0
        ? `${cFormat(dailyAllowance, { currency, decimals: 0 })}/day safe limit`
        : remainingCap < 0
        ? "Daily cap exhausted"
        : `${cFormat(avgDailySpend, { currency, decimals: 0 })}/day avg burn`;

    return {
      statusBadge: badge,
      statusText: text,
      badgeColor: color,
      projectedMonthEnd: projectedEnd,
      dailySafeText: safeRunway,
    };
  }, [pace, summary?.availableBalance, timeElapsedPercent, currency, wallets.length]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Main Row */}
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
            Liquid balance across {wallets.length}{" "}
            {wallets.length === 1 ? "wallet" : "wallets"}
          </span>
        </div>

        {/* Action Controls & Simulator Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAffordModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs sm:text-sm text-ink-primary transition-colors cursor-pointer shadow-sm hover:border-line"
          >
            <BiCalculator size={16} className="text-ink-secondary" />
            <span>“Can I Afford It?” Simulator</span>
          </button>
        </div>
      </div>

      {/* Financial Pulse Insight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface-elevated/50 border border-line-subtle">
        {/* Metric 1: Safe Daily Runway */}
        <div className="flex flex-col justify-between gap-1.5 border-b md:border-b-0 md:border-r border-line-faint pb-3 md:pb-0 md:pr-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-subtle">Safe-to-Spend Runway</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${badgeColor}`}
            >
              {statusBadge}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-normal text-ink-primary tabular-nums">
              {dailySafeText}
            </span>
            <span className="text-xs text-ink-subtle">
              ({pace?.daysRemaining ?? 1}d remaining)
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle truncate">{statusText}</p>
        </div>

        {/* Metric 2: Projected Month-End Balance */}
        <div className="flex flex-col justify-between gap-1.5 border-b md:border-b-0 md:border-r border-line-faint pb-3 md:pb-0 md:pr-4">
          <span className="text-xs text-ink-subtle">Projected Month-End Balance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-normal text-ink-primary tabular-nums">
              ~{cFormat(projectedMonthEnd, { currency, decimals: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle">
            Based on current burn of ~{cFormat(pace?.avgDailySpend || 0, { currency, decimals: 0 })}/day
          </p>
        </div>

        {/* Metric 3: True Wealth Trajectory */}
        <div className="flex flex-col justify-between gap-1.5">
          <span className="text-xs text-ink-subtle">True Wealth Trajectory</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-normal text-emerald-700 tabular-nums">
              {summary?.savingsRate ?? 0}% Savings Rate
            </span>
          </div>
          <p className="text-[11px] text-ink-subtle">
            {(summary?.balance ?? 0) >= 0 ? "+" : ""}
            {cFormat(summary?.balance ?? 0, { currency })} net cashflow this period
          </p>
        </div>
      </div>
    </div>
  );
}
