"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cFormat } from "@/app/utils/currencyFormat";
import {
  useCategoriesQuery,
  usePlanningMutations,
} from "@/app/hooks/useFinanceData";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import Slider from "@/app/components/Slider";

const SPLIT_PRESETS = [
  { label: "50 / 30 / 20", needs: 50, wants: 30, savings: 20 },
  { label: "60 / 20 / 20", needs: 60, wants: 20, savings: 20 },
  { label: "70 / 15 / 15", needs: 70, wants: 15, savings: 15 },
];

export default function CashflowSection({
  planning,
  currency,
  onNavigateTab,
}) {
  const { updatePlan } = usePlanningMutations();
  const { data: categories = [] } = useCategoriesQuery();

  const plan = planning?.plan || {};
  const cashflow = planning?.cashflow || {};
  const goals = planning?.goals || [];
  const recurring = planning?.recurring || [];

  const [form, setForm] = useState({
    monthly_income_target: String(plan.monthly_income_target || 0),
    reserve_buffer: String(plan.reserve_buffer || 0),
    needs_percent: String(plan.needs_percent ?? 50),
    wants_percent: String(plan.wants_percent ?? 30),
    savings_percent: String(plan.savings_percent ?? 20),
    category_buckets: plan.category_buckets || {},
  });

  useEffect(() => {
    setForm({
      monthly_income_target: String(plan.monthly_income_target || 0),
      reserve_buffer: String(plan.reserve_buffer || 0),
      needs_percent: String(plan.needs_percent ?? 50),
      wants_percent: String(plan.wants_percent ?? 30),
      savings_percent: String(plan.savings_percent ?? 20),
      category_buckets: plan.category_buckets || {},
    });
  }, [
    plan.monthly_income_target,
    plan.reserve_buffer,
    plan.needs_percent,
    plan.wants_percent,
    plan.savings_percent,
    plan.category_buckets,
  ]);

  const needsVal = Math.max(0, Math.min(100, Number(form.needs_percent) || 0));
  const wantsVal = Math.max(0, Math.min(100, Number(form.wants_percent) || 0));
  const savingsVal = Math.max(0, Math.min(100, Number(form.savings_percent) || 0));
  const percentSum = needsVal + wantsVal + savingsVal;

  const liveIncomePreview =
    Number(form.monthly_income_target) > 0
      ? Number(form.monthly_income_target)
      : cashflow.plannedIncome || 0;

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (percentSum !== 100) {
      toast.error("Needs, Wants, and Savings percentages must add up to 100%");
      return;
    }
    try {
      await updatePlan.mutateAsync({
        monthly_income_target: Number(form.monthly_income_target) || 0,
        reserve_buffer: Number(form.reserve_buffer) || 0,
        needs_percent: needsVal,
        wants_percent: wantsVal,
        savings_percent: savingsVal,
        category_buckets: form.category_buckets,
      });
      toast.success("Cashflow plan updated");
    } catch (err) {
      toast.error(err.message || "Failed to update cashflow plan");
    }
  };

  const toggleCategoryBucket = (catName) => {
    const current = form.category_buckets?.[catName] || "wants";
    const next = current === "needs" ? "wants" : "needs";
    setForm((prev) => ({
      ...prev,
      category_buckets: {
        ...(prev.category_buckets || {}),
        [catName]: next,
      },
    }));
  };

  const expenseCategoriesWithBudget = categories.filter(
    (c) => c.type !== "income" && Number(c.monthly_budget) > 0
  );

  const buckets = cashflow.allocationBuckets || {
    needs: { targetPercent: 50, targetAmount: 0, plannedAmount: 0 },
    wants: { targetPercent: 30, targetAmount: 0, plannedAmount: 0 },
    savings: { targetPercent: 20, targetAmount: 0, plannedAmount: 0 },
  };

  const bucketRows = [
    {
      key: "needs",
      label: "Needs & Fixed Bills",
      hint: "Recurring bills + essential category budgets",
      ...buckets.needs,
      barColor: "bg-ink-body",
      dotColor: "bg-ink-body",
    },
    {
      key: "wants",
      label: "Lifestyle & Wants",
      hint: "Discretionary category budgets",
      ...buckets.wants,
      barColor: "bg-accent",
      dotColor: "bg-accent",
    },
    {
      key: "savings",
      label: "Savings & Safety Buffer",
      hint: "Monthly goal contributions + reserve buffer",
      ...buckets.savings,
      barColor: "bg-green-100",
      dotColor: "bg-green-100",
    },
  ];

  const incomeSourceLabel =
    cashflow.incomeSource === "plan"
      ? "Based on your monthly target"
      : cashflow.incomeSource === "recurring"
      ? "Auto-estimated from recurring income"
      : cashflow.incomeSource === "actual"
      ? "Based on income earned this month"
      : "Set a monthly income target below";

  const upcomingItems = recurring.filter((r) => r.is_active).slice(0, 4);
  const topGoals = goals.filter((g) => g.status === "active").slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-1.5 transition-colors hover:bg-surface-elevated/70">
          <span className="text-xs text-ink-subtle">Planned Monthly Income</span>
          <AnimatedNumber
            value={cashflow.plannedIncome || 0}
            currency={currency}
            className="text-2xl font-light text-ink-primary"
          />
          <span className="text-xs text-ink-subtle">{incomeSourceLabel}</span>
        </div>

        <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-1.5 transition-colors hover:bg-surface-elevated/70">
          <span className="text-xs text-ink-subtle">Reserved Commitments</span>
          <AnimatedNumber
            value={cashflow.totalReserved || 0}
            currency={currency}
            className="text-2xl font-light text-ink-primary"
          />
          <span className="text-xs text-ink-subtle tabular-nums">
            Bills {cFormat(cashflow.committedRecurringBills || 0, { currency })} • Goals{" "}
            {cFormat(cashflow.plannedGoalSavings || 0, { currency })}
          </span>
        </div>

        <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-1.5 transition-colors hover:bg-surface-elevated/70">
          <span className="text-xs text-ink-subtle">Unallocated Plan Margin</span>
          <AnimatedNumber
            value={cashflow.freeToAllocate || 0}
            currency={currency}
            className={`text-2xl font-light ${
              (cashflow.freeToAllocate || 0) < 0
                ? "text-red-100"
                : "text-green-100"
            }`}
          />
          <span className="text-xs text-ink-subtle">
            After category budgets &amp; goal savings
          </span>
        </div>

        <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-1.5 transition-colors hover:bg-surface-elevated/70">
          <span className="text-xs text-ink-subtle">Free to Spend This Month</span>
          <AnimatedNumber
            value={cashflow.freeToSpend || 0}
            currency={currency}
            className={`text-2xl font-light ${
              (cashflow.freeToSpend || 0) < 0 ? "text-red-100" : "text-ink-primary"
            }`}
          />
          <span className="text-xs text-ink-subtle tabular-nums">
            Spent {cFormat(cashflow.actualExpenseThisMonth || 0, { currency })} • Due{" "}
            {cFormat(cashflow.dueThisMonthExpense || 0, { currency })}
          </span>
        </div>
      </div>

      {/* Allocation Form & Bucket Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form
          onSubmit={handleSavePlan}
          className="lg:col-span-5 bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-5"
        >
          <div className="pb-3 border-b border-line-subtle">
            <h3 className="text-base font-normal text-ink-secondary">
              Monthly Allocation Rules
            </h3>
            <p className="text-xs text-ink-subtle mt-0.5">
              Adjust your income target, buffer, and split ratios interactively.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">
                Expected Monthly Income
              </label>
              <input
                type="number"
                min="0"
                value={form.monthly_income_target}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    monthly_income_target: e.target.value,
                  }))
                }
                placeholder="0"
                className="bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">
                Monthly Safety Buffer
              </label>
              <input
                type="number"
                min="0"
                value={form.reserve_buffer}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reserve_buffer: e.target.value,
                  }))
                }
                placeholder="0"
                className="bg-surface border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus transition-colors"
              />
            </div>
          </div>

          {/* Live Stacked Split Preview */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-subtle">Split Ratio Preview</span>
              <span
                className={`text-xs tabular-nums transition-colors ${
                  percentSum === 100 ? "text-ink-muted" : "text-red-100"
                }`}
              >
                {percentSum === 100
                  ? "Balanced (100%)"
                  : `Total: ${percentSum}% (must equal 100%)`}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-tint overflow-hidden flex gap-0.5">
              <div
                style={{ width: `${Math.min(100, needsVal)}%` }}
                className="h-full bg-ink-body transition-all duration-300 ease-out"
              />
              <div
                style={{ width: `${Math.min(100, wantsVal)}%` }}
                className="h-full bg-accent transition-all duration-300 ease-out"
              />
              <div
                style={{ width: `${Math.min(100, savingsVal)}%` }}
                className="h-full bg-green-100 transition-all duration-300 ease-out"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {SPLIT_PRESETS.map((preset) => {
                const isSelected =
                  needsVal === preset.needs &&
                  wantsVal === preset.wants &&
                  savingsVal === preset.savings;
                return (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        needs_percent: String(preset.needs),
                        wants_percent: String(preset.wants),
                        savings_percent: String(preset.savings),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition-all active:scale-[0.97] ${
                      isSelected
                        ? "bg-cta text-cta-ink border-cta font-medium"
                        : "bg-surface border-line-subtle text-ink-body hover:bg-surface-hover"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders for Needs / Wants / Savings */}
          <div className="flex flex-col gap-2.5">
            {[
              {
                key: "needs_percent",
                label: "Needs",
                val: needsVal,
                dot: "bg-ink-body",
                fill: "bg-ink-body",
                thumb: "bg-cta",
              },
              {
                key: "wants_percent",
                label: "Wants",
                val: wantsVal,
                dot: "bg-accent",
                fill: "bg-accent",
                thumb: "bg-accent",
              },
              {
                key: "savings_percent",
                label: "Savings",
                val: savingsVal,
                dot: "bg-green-100",
                fill: "bg-green-100",
                thumb: "bg-green-100",
              },
            ].map((slider) => (
              <div key={slider.key} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-ink-body">
                    <span className={`w-2 h-2 rounded-full ${slider.dot}`} />
                    {slider.label}
                  </span>
                  <span className="text-ink-muted tabular-nums">
                    {slider.val}%
                    {liveIncomePreview > 0
                      ? ` • ${cFormat(
                          Math.round((liveIncomePreview * slider.val) / 100),
                          { currency }
                        )}`
                      : ""}
                  </span>
                </div>
                <Slider
                  ariaLabel={`${slider.label} allocation percentage`}
                  min={0}
                  max={100}
                  step={1}
                  value={slider.val}
                  fillClassName={slider.fill}
                  thumbClassName={slider.thumb}
                  onChange={(nextVal) =>
                    setForm((prev) => ({
                      ...prev,
                      [slider.key]: String(nextVal),
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {expenseCategoriesWithBudget.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-xs text-ink-subtle">
                Budgeted Category Grouping (click to switch Needs / Wants)
              </span>
              <div className="flex flex-wrap gap-2">
                {expenseCategoriesWithBudget.map((cat) => {
                  const defaultNeeds = [
                    "Bills & Utilities",
                    "Groceries",
                    "Health",
                    "Rent",
                    "Utilities",
                  ].includes(cat.name);
                  const bucket =
                    form.category_buckets?.[cat.name] ||
                    (defaultNeeds ? "needs" : "wants");
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => toggleCategoryBucket(cat.name)}
                      className="px-3 py-1.5 rounded-full text-xs bg-surface border border-line-subtle text-ink-body hover:bg-surface-hover flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] capitalize transition-colors ${
                          bucket === "needs"
                            ? "bg-tint-hover text-ink-secondary"
                            : "bg-accent-soft text-accent"
                        }`}
                      >
                        {bucket}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={updatePlan.isPending || percentSum !== 100}
            className="mt-auto px-5 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 self-start"
          >
            {updatePlan.isPending ? "Saving..." : "Save Allocation Plan"}
          </button>
        </form>

        <div className="lg:col-span-7 bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-5">
          <div className="pb-3 border-b border-line-subtle">
            <h3 className="text-base font-normal text-ink-secondary">
              Target vs. Planned Commitments
            </h3>
            <p className="text-xs text-ink-subtle mt-0.5">
              How your recurring bills, category budgets, and goal contributions fit your split.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {bucketRows.map((row) => {
              const pct =
                row.targetAmount > 0
                  ? Math.min(100, Math.round((row.plannedAmount / row.targetAmount) * 100))
                  : row.plannedAmount > 0
                  ? 100
                  : 0;
              const over = row.targetAmount > 0 && row.plannedAmount > row.targetAmount;
              return (
                <div
                  key={row.key}
                  className="p-4 rounded-xl bg-surface border border-line-faint flex flex-col gap-2.5 transition-colors hover:border-line"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm font-normal text-ink-secondary flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${row.dotColor}`} />
                        <span>{row.label}</span>
                        <span className="text-xs text-ink-subtle tabular-nums">
                          ({row.targetPercent}%)
                        </span>
                      </div>
                      <div className="text-xs text-ink-subtle pl-4">{row.hint}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      <AnimatedNumber
                        value={row.plannedAmount}
                        currency={currency}
                        className={`text-sm font-medium ${
                          over ? "text-red-100" : "text-ink-secondary"
                        }`}
                      />
                      <span className="text-xs text-ink-subtle ml-1">
                        / {cFormat(row.targetAmount, { currency })} target
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-tint overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        over ? "bg-red-100" : row.barColor
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-surface border border-line-faint flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-normal text-ink-secondary">
                  Active Savings Goals
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab("goals")}
                  className="text-xs text-ink-muted hover:text-ink-primary cursor-pointer transition-colors"
                >
                  Manage →
                </button>
              </div>
              {topGoals.length === 0 ? (
                <p className="text-xs text-ink-subtle">
                  No active savings goals yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topGoals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink-body truncate pr-2">{g.name}</span>
                      <span className="text-ink-muted shrink-0 tabular-nums">
                        {g.progress_percent}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface border border-line-faint flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-normal text-ink-secondary">
                  Upcoming Recurring
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab("recurring")}
                  className="text-xs text-ink-muted hover:text-ink-primary cursor-pointer transition-colors"
                >
                  Manage →
                </button>
              </div>
              {upcomingItems.length === 0 ? (
                <p className="text-xs text-ink-subtle">
                  No recurring bills or income scheduled.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="text-ink-body truncate pr-2">
                        {item.title}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          item.type === "income" ? "text-green-100" : "text-ink-muted"
                        }`}
                      >
                        {item.type === "income" ? "+" : "-"}
                        {cFormat(item.amount, { currency })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
