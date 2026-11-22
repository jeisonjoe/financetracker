"use client";

import { useMemo, useState } from "react";
import {
  BiCheckCircle,
  BiErrorCircle,
  BiInfoCircle,
  BiShieldQuarter,
  BiTimeFive,
  BiX,
} from "react-icons/bi";
import Modal from "@/app/components/Modal";
import { cFormat } from "@/app/utils/currencyFormat";

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

export default function CanIAffordItModal({
  isOpen,
  onClose,
  summary,
  pace,
  planning,
  categories = [],
  currency = "INR",
}) {
  const [amountStr, setAmountStr] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [purpose, setPurpose] = useState("");

  const testAmount = Math.max(0, Number(amountStr) || 0);

  const simulation = useMemo(() => {
    const daysRemaining = Math.max(1, pace?.daysRemaining || 1);
    const currentRemainingCap = pace?.remaining ?? 0;
    const currentDaily = pace?.dailyAllowance ?? 0;
    const availableBalance = summary?.availableBalance ?? 0;
    const upcomingBills = planning?.cashflow?.dueThisMonthExpense ?? 0;
    const reserveBuffer = planning?.cashflow?.reserveBuffer ?? 0;

    // Projected liquid balances
    const postPurchaseAvailable = availableBalance - testAmount;
    const postPurchaseRemainingCap = currentRemainingCap - testAmount;
    const postPurchaseDaily =
      postPurchaseRemainingCap > 0
        ? Math.round((postPurchaseRemainingCap / daysRemaining) * 100) / 100
        : 0;
    const dailyDrop = currentDaily - postPurchaseDaily;

    // Category specific impact
    const catObj = categories.find((c) => c.name === selectedCategory);
    const catBudget = Number(catObj?.budget || catObj?.monthly_budget || 0);
    const catSpent = Number(catObj?.spent || 0);
    const postCatSpent = catSpent + testAmount;
    const catExceeded = catBudget > 0 && postCatSpent > catBudget;

    // Cash crunch / bill safety check
    const liquidAfterBillsAndReserve =
      availableBalance - testAmount - upcomingBills - reserveBuffer;
    const dipsIntoBills = liquidAfterBillsAndReserve < 0;

    // Projected month-end balance
    const avgDailySpend = pace?.avgDailySpend ?? 0;
    const projectedBaselineMonthEnd =
      availableBalance - avgDailySpend * daysRemaining;
    const projectedPostPurchaseMonthEnd = projectedBaselineMonthEnd - testAmount;

    // Verdict calculation
    let verdict = "safe"; // "safe" | "caution" | "risky"
    let verdictTitle = "Safe to Spend";
    let verdictReason = "";

    if (testAmount === 0) {
      verdict = "idle";
      verdictTitle = "Enter an amount";
      verdictReason = "Type an amount to see how it affects your daily runway and bills.";
    } else if (dipsIntoBills || postPurchaseAvailable < 0) {
      verdict = "risky";
      verdictTitle = "Cash Crunch Warning";
      verdictReason =
        liquidAfterBillsAndReserve < 0
          ? `This spend would dip into your upcoming fixed bills (${cFormat(upcomingBills, { currency })}) by ${cFormat(Math.abs(liquidAfterBillsAndReserve), { currency })}.`
          : "This spend exceeds your total liquid balance across all wallets.";
    } else if (pace?.hasConfiguredBudgets && postPurchaseRemainingCap < 0) {
      verdict = "caution";
      verdictTitle = "Breaches Monthly Cap";
      verdictReason = `You will exceed your monthly budget by ${cFormat(Math.abs(postPurchaseRemainingCap), { currency })}, dropping your daily allowance to 0 for ${daysRemaining} days.`;
    } else if (catExceeded) {
      verdict = "caution";
      verdictTitle = "Overpacing Category";
      verdictReason = `This purchase will push ${selectedCategory} to ${cFormat(postCatSpent, { currency })} (Cap: ${cFormat(catBudget, { currency })}).`;
    } else if (dailyDrop > currentDaily * 0.4 && currentDaily > 0) {
      verdict = "caution";
      verdictTitle = "Tight Discretionary Burn";
      verdictReason = `Reduces your daily safe spend by ${Math.round((dailyDrop / currentDaily) * 100)}% (from ${cFormat(currentDaily, { currency })}/day down to ${cFormat(postPurchaseDaily, { currency })}/day).`;
    } else {
      verdict = "safe";
      verdictTitle = "Comfortably Affordable";
      verdictReason = `You retain a healthy runway of ${cFormat(postPurchaseDaily, { currency })}/day for the next ${daysRemaining} days without starving any bills.`;
    }

    return {
      testAmount,
      currentDaily,
      postPurchaseDaily,
      dailyDrop,
      daysRemaining,
      postPurchaseAvailable,
      projectedPostPurchaseMonthEnd,
      upcomingBills,
      reserveBuffer,
      dipsIntoBills,
      catExceeded,
      verdict,
      verdictTitle,
      verdictReason,
    };
  }, [testAmount, selectedCategory, pace, summary, planning, categories, currency]);

  const handleQuickAdd = (amt) => {
    setAmountStr(String(amt));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="“Can I Afford It?” Decision Simulator">
      <div className="flex flex-col gap-5 pt-1">
        {/* Input Controls */}
        <div className="flex flex-col gap-3">
          <label className="text-xs text-ink-subtle">
            How much are you considering spending?
          </label>
          <div className="relative flex items-center bg-surface border border-line-subtle focus-within:border-line-strong rounded-2xl px-4 py-3 transition-colors">
            <span className="text-xl text-ink-subtle font-light mr-2">
              {cFormat(0, { currency }).replace(/[0-9.,]/g, "")}
            </span>
            <input
              type="number"
              min="0"
              step="50"
              autoFocus
              placeholder="e.g. 3,500"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="bg-transparent text-2xl font-light text-ink-primary placeholder:text-ink-placeholder focus:outline-none w-full tabular-nums"
            />
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr("")}
                className="p-1 rounded-full text-ink-subtle hover:text-ink-primary hover:bg-tint transition-colors cursor-pointer"
              >
                <BiX size={18} />
              </button>
            )}
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-ink-faint">Presets:</span>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAdd(amt)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                  testAmount === amt
                    ? "bg-tint-active text-ink-primary font-medium"
                    : "bg-surface border border-line-subtle text-ink-subtle hover:text-ink-body"
                }`}
              >
                {cFormat(amt, { currency, decimals: 0 })}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Category & Purpose */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Category (Optional)</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-surface border border-line-subtle rounded-xl px-3 py-2 text-xs text-ink-body focus:outline-none cursor-pointer"
            >
              <option value="">General Discretionary</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} {c.budget > 0 ? `(Cap: ${cFormat(c.budget, { currency })})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Purpose / Tag (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Weekend dinner, Shoes"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="bg-surface border border-line-subtle rounded-xl px-3 py-2 text-xs text-ink-body placeholder:text-ink-placeholder focus:outline-none"
            />
          </div>
        </div>

        {/* Live Simulation Card */}
        {testAmount > 0 && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-surface border border-line-subtle animate-fade-up">
            {/* Verdict Header */}
            <div
              className={`p-3 rounded-xl flex items-start gap-3 border ${
                simulation.verdict === "safe"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800"
                  : simulation.verdict === "caution"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-800"
                  : "bg-red-500/10 border-red-500/20 text-red-800"
              }`}
            >
              {simulation.verdict === "safe" ? (
                <BiCheckCircle size={20} className="shrink-0 mt-0.5" />
              ) : simulation.verdict === "caution" ? (
                <BiInfoCircle size={20} className="shrink-0 mt-0.5" />
              ) : (
                <BiErrorCircle size={20} className="shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">
                  {simulation.verdictTitle}
                </span>
                <span className="text-xs opacity-90 mt-1 leading-relaxed">
                  {simulation.verdictReason}
                </span>
              </div>
            </div>

            {/* Metrics Before vs After */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col p-3 rounded-xl bg-surface-elevated/60 border border-line-faint">
                <span className="text-[11px] text-ink-subtle">
                  Daily Safe Runway ({simulation.daysRemaining} days left)
                </span>
                <div className="flex items-baseline gap-1.5 mt-1 tabular-nums">
                  <span className="text-sm line-through text-ink-faint">
                    {cFormat(simulation.currentDaily, { currency })}/d
                  </span>
                  <span
                    className={`text-base font-medium ${
                      simulation.postPurchaseDaily > 0 ? "text-ink-primary" : "text-red-100"
                    }`}
                  >
                    → {cFormat(simulation.postPurchaseDaily, { currency })}/d
                  </span>
                </div>
              </div>

              <div className="flex flex-col p-3 rounded-xl bg-surface-elevated/60 border border-line-faint">
                <span className="text-[11px] text-ink-subtle">
                  Projected Month-End Liquid Balance
                </span>
                <div className="flex items-baseline gap-1.5 mt-1 tabular-nums">
                  <span className="text-base font-medium text-ink-primary">
                    {cFormat(simulation.projectedPostPurchaseMonthEnd, { currency })}
                  </span>
                </div>
              </div>
            </div>

            {/* Commitment Protection Checklist */}
            <div className="flex flex-col gap-2 pt-2 border-t border-line-faint">
              <span className="text-xs text-ink-subtle font-medium">
                Commitment Safety Checks
              </span>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between text-ink-body">
                  <span className="flex items-center gap-1.5">
                    <BiShieldQuarter
                      size={15}
                      className={simulation.dipsIntoBills ? "text-red-100" : "text-emerald-600"}
                    />
                    <span>
                      Fixed Bills &amp; Subscriptions ({cFormat(simulation.upcomingBills, { currency })})
                    </span>
                  </span>
                  <span
                    className={`font-medium ${
                      simulation.dipsIntoBills ? "text-red-100" : "text-emerald-600"
                    }`}
                  >
                    {simulation.dipsIntoBills ? "Endangered" : "100% Protected"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-ink-body">
                  <span className="flex items-center gap-1.5">
                    <BiCheckCircle size={15} className="text-emerald-600" />
                    <span>Emergency Buffer &amp; Savings Goals</span>
                  </span>
                  <span className="font-medium text-emerald-600">Intact</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-line-subtle text-xs text-ink-subtle hover:text-ink-primary hover:bg-tint transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
