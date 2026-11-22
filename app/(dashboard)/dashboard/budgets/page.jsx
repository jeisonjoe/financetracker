"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BiEdit, BiPlus, BiSearch, BiSliderAlt, BiTrendingUp } from "react-icons/bi";
import { toast } from "sonner";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import ProgressRing from "@/app/components/ProgressRing";
import LoadingAnim from "@/app/components/LoadingAnim";
import RenderIcon from "@/app/components/RenderIcon";
import BudgetComparisonChart from "@/app/components/charts/BudgetComparisonChart";
import { useGlobalPeriod } from "@/app/store/PeriodStore";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  useAnalytics,
  useCategoriesQuery,
  useCategoryMutations,
  usePlanningOverview,
} from "@/app/hooks/useFinanceData";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { cFormat, getCurrencySymbol } from "@/app/utils/currencyFormat";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "budgeted", label: "Budgeted" },
  { key: "unbudgeted", label: "Unbudgeted" },
  { key: "over", label: "Over Limit" },
];

const PERIOD_LABELS = {
  this_month: "This Month",
  last_month: "Last Month",
  last_3_months: "Last 3 Months",
  all_time: "All Time",
};

function isExpenseBudgetCategory(category) {
  if (!category || category.type === "income") return false;
  return category.name?.trim().toLowerCase() !== "transfer";
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const symbol = getCurrencySymbol(currency);
  const { open } = useRhsSidebarStore();

  const { period } = useGlobalPeriod();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [draftBudgets, setDraftBudgets] = useState({});
  const [savingBudgets, setSavingBudgets] = useState(false);

  const { data: categories = [], isLoading } = useCategoriesQuery();
  const { data: analytics } = useAnalytics(period);
  const { data: planning } = usePlanningOverview();
  const { updateCategory } = useCategoryMutations();

  const allExpenseCategories = useMemo(
    () => categories.filter(isExpenseBudgetCategory),
    [categories]
  );

  const budgetCategories = useMemo(
    () => allExpenseCategories.filter((c) => !c.parent_id && !c.parentId),
    [allExpenseCategories]
  );

  const subcategoriesByParentId = useMemo(() => {
    const map = new Map();
    for (const c of allExpenseCategories) {
      if (c.parent_id || c.parentId) {
        const pId = String(c.parent_id || c.parentId);
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId).push(c);
      }
    }
    return map;
  }, [allExpenseCategories]);

  const subSpentMap = useMemo(() => {
    const map = new Map();
    for (const cat of analytics?.categoryBreakdown || []) {
      for (const sub of cat.subcategories || []) {
        map.set(`${cat.name}:::${sub.name}`, sub.spent);
      }
    }
    return map;
  }, [analytics?.categoryBreakdown]);

  const spentByName = useMemo(
    () =>
      new Map(
        (analytics?.categoryBreakdown || []).map((item) => [item.name, item.spent])
      ),
    [analytics?.categoryBreakdown]
  );

  const getEffectiveBudget = (cat) => {
    if (draftBudgets[cat.id] !== undefined) {
      return Math.max(0, Number(draftBudgets[cat.id]) || 0);
    }
    return Math.max(0, Number(cat.monthly_budget) || 0);
  };

  const dirtyCategories = useMemo(
    () =>
      allExpenseCategories.filter((cat) => {
        if (draftBudgets[cat.id] === undefined) return false;
        const nextVal = Math.max(0, Number(draftBudgets[cat.id]) || 0);
        const currentVal = Number(cat.monthly_budget) || 0;
        return nextVal !== currentVal;
      }),
    [allExpenseCategories, draftBudgets]
  );

  const stats = useMemo(() => {
    let totalBudget = 0;
    let budgetedCount = 0;
    let overCount = 0;

    for (const cat of budgetCategories) {
      const limit = getEffectiveBudget(cat);
      const spent = spentByName.get(cat.name) || 0;
      totalBudget += limit;
      if (limit > 0) {
        budgetedCount += 1;
        if (spent > limit) overCount += 1;
      }
    }

    return { totalBudget, budgetedCount, overCount };
  }, [budgetCategories, draftBudgets, spentByName]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return budgetCategories.filter((cat) => {
      if (q && !cat.name.toLowerCase().includes(q)) return false;
      const limit = getEffectiveBudget(cat);
      const spent = spentByName.get(cat.name) || 0;

      if (filter === "budgeted") return limit > 0;
      if (filter === "unbudgeted") return limit === 0;
      if (filter === "over") return limit > 0 && spent > limit;
      return true;
    });
  }, [budgetCategories, search, filter, draftBudgets, spentByName]);

  const totalSpent = analytics?.summary?.expense || 0;
  const remainingTotal = stats.totalBudget - totalSpent;
  const rawPct =
    stats.totalBudget > 0 ? Math.round((totalSpent / stats.totalBudget) * 100) : 0;
  const ringPct = Math.min(100, rawPct);

  const cashflow = planning?.cashflow;
  const plannedIncome = cashflow?.plannedIncome || 0;
  const plannedSavings = cashflow?.plannedGoalSavings || 0;
  const liveFreeToAllocate = plannedIncome - stats.totalBudget - plannedSavings;

  const breakdown = analytics?.categoryBreakdown || [];
  const breakdownByName = useMemo(
    () => new Map((analytics?.categoryBreakdown || []).map((b) => [b.name, b])),
    [analytics?.categoryBreakdown]
  );

  const handleSaveAllBudgets = async (e) => {
    if (e) e.preventDefault();
    if (dirtyCategories.length === 0) return;

    setSavingBudgets(true);
    try {
      await Promise.all(
        dirtyCategories.map((cat) =>
          updateCategory.mutateAsync({
            id: cat.id,
            payload: {
              monthly_budget: Math.max(0, Number(draftBudgets[cat.id]) || 0),
            },
          })
        )
      );
      setDraftBudgets({});
      toast.success(
        `Updated ${dirtyCategories.length} ${
          dirtyCategories.length === 1 ? "budget" : "budgets"
        }`
      );
    } catch (err) {
      toast.error(err.message || "Failed to update budgets");
    } finally {
      setSavingBudgets(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex justify-center items-center">
        <LoadingAnim />
      </div>
    );
  }

  const budgetSharePct =
    plannedIncome > 0
      ? Math.min(100, Math.round((stats.totalBudget / plannedIncome) * 100))
      : 0;
  const savingsSharePct =
    plannedIncome > 0
      ? Math.min(
          Math.max(0, 100 - budgetSharePct),
          Math.round((plannedSavings / plannedIncome) * 100)
        )
      : 0;

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Unified Hero Summary Card */}
      <section className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 sm:p-6 animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <ProgressRing
              percent={ringPct}
              size={72}
              strokeWidth={6}
              colorClass={
                stats.totalBudget > 0 && totalSpent > stats.totalBudget
                  ? "text-red-100"
                  : "text-green-100"
              }
              label={`${rawPct}%`}
            />

            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-normal text-ink-primary tabular-nums truncate">
                {stats.totalBudget > 0
                  ? `${cFormat(totalSpent, { currency })} spent of ${cFormat(
                      stats.totalBudget,
                      { currency }
                    )}`
                  : "Set your monthly category limits"}
              </div>
              <p className="text-xs sm:text-sm text-ink-subtle mt-1 tabular-nums">
                {stats.totalBudget > 0 ? (
                  <>
                    <span
                      className={
                        remainingTotal < 0 ? "text-red-100" : "text-green-100"
                      }
                    >
                      {remainingTotal < 0
                        ? `${cFormat(Math.abs(remainingTotal), { currency })} over budget`
                        : `${cFormat(remainingTotal, { currency })} left`}
                    </span>
                    {` · ${stats.budgetedCount} of ${budgetCategories.length} categories capped`}
                  </>
                ) : (
                  `${budgetCategories.length} expense categories ready for monthly limits`
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/categories"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs sm:text-sm text-ink-body transition-colors"
            >
              <BiSliderAlt size={15} />
              <span>Manage Categories</span>
            </Link>
            <button
              type="button"
              onClick={() => open(AddCategoryPane)}
              className="bg-cta hover:bg-cta-hover text-cta-ink inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium cursor-pointer transition-colors"
            >
              <BiPlus size={17} />
              <span>New Category</span>
            </button>
          </div>
        </div>

        {/* Integrated Cashflow Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center lg:justify-between gap-4 pt-4 mt-5 border-t border-line-subtle">
          <div>
            <div className="text-xs text-ink-subtle">Planned Income</div>
            <div className="text-sm sm:text-base font-medium text-ink-secondary mt-0.5 tabular-nums">
              {plannedIncome > 0
                ? cFormat(plannedIncome, { currency })
                : "Not set"}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Category Budgets</div>
            <div className="text-sm sm:text-base font-medium text-ink-secondary mt-0.5 tabular-nums">
              {cFormat(stats.totalBudget, { currency })}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Goal Savings / mo</div>
            <div className="text-sm sm:text-base font-medium text-ink-secondary mt-0.5 tabular-nums">
              {cFormat(plannedSavings, { currency })}
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Unallocated Margin</div>
            <div
              className={`text-sm sm:text-base font-medium mt-0.5 tabular-nums ${
                liveFreeToAllocate < 0 ? "text-red-100" : "text-green-100"
              }`}
            >
              {plannedIncome > 0
                ? cFormat(liveFreeToAllocate, { currency })
                : "—"}
            </div>
          </div>
          <Link
            href="/dashboard/planning"
            className="col-span-2 sm:col-span-4 lg:col-span-1 text-xs text-ink-muted hover:text-ink-primary transition-colors lg:text-right"
          >
            Adjust Cashflow Plan →
          </Link>
        </div>
      </section>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Category Limits Grid */}
        <form
          onSubmit={handleSaveAllBudgets}
          className="lg:col-span-8 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-surface border border-line-subtle p-1 rounded-full">
              {FILTER_OPTIONS.filter(
                (opt) => opt.key !== "over" || stats.overCount > 0 || filter === "over"
              ).map((opt) => {
                const active = filter === opt.key;
                const count =
                  opt.key === "all"
                    ? budgetCategories.length
                    : opt.key === "budgeted"
                    ? stats.budgetedCount
                    : opt.key === "unbudgeted"
                    ? budgetCategories.length - stats.budgetedCount
                    : stats.overCount;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                      active
                        ? "bg-tint-active text-ink-primary font-medium"
                        : "text-ink-subtle hover:text-ink-body"
                    }`}
                  >
                    {opt.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 grow sm:grow-0">
              <div className="flex items-center gap-2 bg-surface border border-line-subtle rounded-full px-3.5 py-1.5 grow sm:w-52">
                <BiSearch className="text-ink-subtle shrink-0" size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="bg-transparent text-xs sm:text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none w-full"
                />
              </div>

              {dirtyCategories.length > 0 && (
                <button
                  type="submit"
                  disabled={savingBudgets}
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-cta hover:bg-cta-hover text-cta-ink cursor-pointer transition-colors shrink-0 disabled:opacity-60"
                >
                  {savingBudgets ? "Saving..." : `Save (${dirtyCategories.length})`}
                </button>
              )}
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-subtle">
              No matching expense categories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCategories.map((cat) => {
                const subs = subcategoriesByParentId.get(String(cat.id)) || [];
                const spent = spentByName.get(cat.name) || 0;
                const effectiveLimit = getEffectiveBudget(cat);
                const isDirty = dirtyCategories.some((d) => d.id === cat.id);
                const isOver = effectiveLimit > 0 && spent > effectiveLimit;
                const progressPct =
                  effectiveLimit > 0
                    ? Math.min(100, Math.round((spent / effectiveLimit) * 100))
                    : 0;
                const remaining = effectiveLimit - spent;

                const catMeta = breakdownByName.get(cat.name) || {};
                const hasRollover = Boolean(catMeta.rollover ?? cat.icon?.rollover);
                const carryover = catMeta.carryover || 0;
                const catColor = catMeta.color || cat.icon?.color;

                const rawValue =
                  draftBudgets[cat.id] !== undefined
                    ? draftBudgets[cat.id]
                    : cat.monthly_budget > 0
                    ? String(cat.monthly_budget)
                    : "";

                const barColor = isOver
                  ? "bg-red-100"
                  : progressPct >= 80
                  ? "bg-accent"
                  : "bg-green-100";

                return (
                  <div
                    key={cat.id}
                    className={`group rounded-2xl bg-surface border p-4 flex flex-col gap-3 transition-colors ${
                      isDirty
                        ? "border-line-strong"
                        : isOver
                        ? "border-red-100/40"
                        : "border-line-faint hover:border-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-xl bg-tint text-ink-secondary flex items-center justify-center shrink-0">
                          {catColor && (
                            <span
                              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface"
                              style={{ backgroundColor: catColor }}
                            />
                          )}
                          <RenderIcon
                            icon={cat.icon}
                            name={cat.name}
                            props={{ className: "text-lg" }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink-primary truncate flex items-center gap-1.5">
                            <span>{cat.name}</span>
                          </div>
                          <div className="text-xs text-ink-subtle tabular-nums">
                            Spent {cFormat(spent, { currency })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {effectiveLimit > 0 ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full tabular-nums ${
                              isOver
                                ? "bg-red-10 text-red-100"
                                : "bg-tint-subtle text-ink-muted"
                            }`}
                          >
                            {isOver
                              ? `Over ${cFormat(Math.abs(remaining), { currency })}`
                              : `${cFormat(remaining, { currency })} left`}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-faint px-1.5">
                            No cap
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => open(AddCategoryPane, { category: cat })}
                          className="p-1.5 rounded-full text-ink-subtle hover:text-ink-primary hover:bg-tint transition-colors cursor-pointer"
                          title={`Edit ${cat.name}`}
                        >
                          <BiEdit size={15} />
                        </button>
                      </div>
                    </div>

                    {hasRollover && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-subtle bg-surface-elevated/70 px-2.5 py-1 rounded-lg border border-line-subtle">
                        <span className="font-medium text-ink-secondary">Rollover</span>
                        {carryover !== 0 && (
                          <span
                            className={
                              carryover > 0
                                ? "text-green-100 font-medium"
                                : "text-red-100 font-medium"
                            }
                          >
                            {carryover > 0
                              ? `+${cFormat(carryover, { currency })}`
                              : `-${cFormat(Math.abs(carryover), { currency })}`}
                          </span>
                        )}
                        <span className="text-ink-subtle">
                          Base: {cFormat(cat.monthly_budget || 0, { currency })}
                        </span>
                        {carryover !== 0 && (
                          <span className="text-ink-subtle">
                            • Effective: {cFormat(catMeta.budget || effectiveLimit, { currency })}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="w-full h-1.5 rounded-full bg-tint overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-xs text-ink-subtle">Monthly limit</span>
                      <div className="flex items-center bg-surface-elevated border border-line rounded-full px-3 py-1 gap-1.5 focus-within:border-line-focus">
                        <span className="text-xs text-ink-subtle">{symbol}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          aria-label={`Monthly limit for ${cat.name}`}
                          value={rawValue}
                          onChange={(e) =>
                            setDraftBudgets((prev) => ({
                              ...prev,
                              [cat.id]: e.target.value,
                            }))
                          }
                          className="w-24 bg-transparent text-xs sm:text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none tabular-nums text-right"
                        />
                      </div>
                    </div>

                    {/* Subcategories Individual Budgets */}
                    {subs.length > 0 && (
                      <div className="pt-2.5 border-t border-line-faint flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[11px] text-ink-subtle">
                          <span className="font-medium">Subcategories ({subs.length})</span>
                          <span className="text-ink-faint">Individual caps</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {subs.map((sub) => {
                            const subSpent =
                              subSpentMap.get(`${cat.name}:::${sub.name}`) || 0;
                            const subEffectiveLimit = getEffectiveBudget(sub);
                            const subIsOver =
                              subEffectiveLimit > 0 && subSpent > subEffectiveLimit;
                            const subProgressPct =
                              subEffectiveLimit > 0
                                ? Math.min(
                                    100,
                                    Math.round(
                                      (subSpent / subEffectiveLimit) * 100
                                    )
                                  )
                                : 0;
                            const subRawValue =
                              draftBudgets[sub.id] !== undefined
                                ? draftBudgets[sub.id]
                                : sub.monthly_budget > 0
                                ? String(sub.monthly_budget)
                                : "";

                            return (
                              <div
                                key={sub.id}
                                className="flex flex-col gap-1 p-2 bg-surface-elevated/40 rounded-xl border border-line-faint"
                              >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-ink-subtle text-[11px]">
                                      ↳
                                    </span>
                                    <span className="truncate text-ink-body font-medium">
                                      {sub.name}
                                    </span>
                                    <span className="text-[11px] text-ink-subtle tabular-nums">
                                      Spent {cFormat(subSpent, { currency })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] text-ink-subtle">
                                      {symbol}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="No cap"
                                      aria-label={`Monthly limit for subcategory ${sub.name}`}
                                      value={subRawValue}
                                      onChange={(e) =>
                                        setDraftBudgets((prev) => ({
                                          ...prev,
                                          [sub.id]: e.target.value,
                                        }))
                                      }
                                      className="w-16 bg-surface border border-line rounded px-1.5 py-0.5 text-xs text-ink-primary placeholder:text-ink-placeholder text-right tabular-nums focus:outline-none focus:border-line-focus"
                                    />
                                  </div>
                                </div>
                                {subEffectiveLimit > 0 && (
                                  <div className="w-full h-1 rounded-full bg-tint overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        subIsOver ? "bg-red-100" : "bg-ink-muted"
                                      }`}
                                      style={{ width: `${subProgressPct}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {dirtyCategories.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line-subtle">
              <span className="text-xs text-ink-muted">
                {dirtyCategories.length}{" "}
                {dirtyCategories.length === 1 ? "category" : "categories"} modified
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraftBudgets({})}
                  className="px-4 py-2 rounded-full text-xs bg-surface hover:bg-surface-hover border border-line-subtle text-ink-body cursor-pointer transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={savingBudgets}
                  className="px-5 py-2 rounded-full text-xs font-medium bg-cta hover:bg-cta-hover text-cta-ink cursor-pointer transition-colors disabled:opacity-60"
                >
                  {savingBudgets
                    ? "Saving..."
                    : `Save Changes (${dirtyCategories.length})`}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Right: Cashflow Allocation & Period Top Spending */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Income Allocation Card */}
          <div className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-normal text-ink-secondary">
                Income Allocation
              </h2>
              <BiTrendingUp className="text-ink-subtle" size={17} />
            </div>

            {plannedIncome > 0 ? (
              <>
                <div className="w-full h-2.5 rounded-full bg-tint overflow-hidden flex">
                  {budgetSharePct > 0 && (
                    <div
                      className="h-full bg-ink-secondary transition-all duration-300"
                      style={{ width: `${budgetSharePct}%` }}
                    />
                  )}
                  {savingsSharePct > 0 && (
                    <div
                      className="h-full bg-green-100 transition-all duration-300"
                      style={{ width: `${savingsSharePct}%` }}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-body">
                      <span className="w-2 h-2 rounded-full bg-ink-secondary" />
                      Category Budgets
                    </span>
                    <span className="text-ink-secondary tabular-nums">
                      {cFormat(stats.totalBudget, { currency })} ({budgetSharePct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-ink-body">
                      <span className="w-2 h-2 rounded-full bg-green-100" />
                      Goal Savings
                    </span>
                    <span className="text-ink-secondary tabular-nums">
                      {cFormat(plannedSavings, { currency })} ({savingsSharePct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-line-faint">
                    <span className="text-ink-subtle">Unallocated Margin</span>
                    <span
                      className={`font-medium tabular-nums ${
                        liveFreeToAllocate < 0 ? "text-red-100" : "text-green-100"
                      }`}
                    >
                      {cFormat(liveFreeToAllocate, { currency })}
                    </span>
                  </div>
                </div>

                {stats.totalBudget === 0 && (
                  <div className="rounded-xl bg-surface border border-line-faint p-3.5 text-xs text-ink-subtle flex flex-col gap-1.5">
                    <span className="text-ink-body font-medium">
                      50 / 30 / 20 Reference
                    </span>
                    <div className="flex justify-between tabular-nums">
                      <span>Essentials (50%)</span>
                      <span>{cFormat(Math.round(plannedIncome * 0.5), { currency })}</span>
                    </div>
                    <div className="flex justify-between tabular-nums">
                      <span>Lifestyle (30%)</span>
                      <span>{cFormat(Math.round(plannedIncome * 0.3), { currency })}</span>
                    </div>
                    <div className="flex justify-between tabular-nums">
                      <span>Savings & Invest (20%)</span>
                      <span>{cFormat(Math.round(plannedIncome * 0.2), { currency })}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3 text-xs sm:text-sm text-ink-subtle">
                <p>
                  Add your expected monthly income in Planning to see how your
                  category limits and savings goals fit inside your paycheck.
                </p>
                <Link
                  href="/dashboard/planning"
                  className="self-start px-3.5 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs text-ink-body transition-colors"
                >
                  Set Planned Income →
                </Link>
              </div>
            )}
          </div>

          {/* Budget vs Actual Comparison Chart Card */}
          {breakdown.length > 0 && (
            <div className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-normal text-ink-secondary">
                  Budget vs. Spent
                </h2>
              </div>
              <BudgetComparisonChart categories={breakdown} currency={currency} height={200} />
            </div>
          )}

          {/* Top Spending Card */}
          <div className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-normal text-ink-secondary">
                Top Spending
              </h2>
              <span className="text-xs text-ink-subtle">
                {period.startsWith("custom:") ? "Custom Range" : (PERIOD_LABELS[period] || "This Month")}
              </span>
            </div>

            {breakdown.length === 0 ? (
              <div className="py-5 text-center flex flex-col gap-1">
                <span className="text-sm text-ink-subtle">
                  No expenses logged for this period
                </span>
                <span className="text-xs text-ink-faint">
                  Add a transaction to compare actual spend against limits.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {breakdown.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <RenderIcon
                          icon={item.icon}
                          name={item.name}
                          props={{ className: "text-base text-ink-muted shrink-0" }}
                        />
                        <span className="text-ink-body truncate">{item.name}</span>
                      </div>
                      <span className="text-ink-secondary font-medium tabular-nums shrink-0">
                        {cFormat(item.spent, { currency })} ({item.sharePercent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-tint overflow-hidden">
                      <div
                        className="h-full rounded-full bg-ink-muted transition-all duration-300"
                        style={{ width: `${Math.min(100, item.sharePercent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
