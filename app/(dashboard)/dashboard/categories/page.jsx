"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BiEdit, BiPlus, BiSearch, BiSliderAlt, BiTrash } from "react-icons/bi";
import { toast } from "sonner";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import ActionModal from "@/app/components/ActionModal";
import LoadingAnim from "@/app/components/LoadingAnim";
import PeriodSelector from "@/app/components/PeriodSelector";
import RenderIcon from "@/app/components/RenderIcon";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  useAnalytics,
  useCategoriesQuery,
  useCategoryMutations,
} from "@/app/hooks/useFinanceData";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { cFormat } from "@/app/utils/currencyFormat";

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "expense", label: "Expense" },
  { key: "income", label: "Income" },
  { key: "both", label: "Transfer / Both" },
];

const TYPE_LABELS = {
  expense: "Expense",
  income: "Income",
  both: "Transfer / Both",
};

export default function CategoriesPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const { open } = useRhsSidebarStore();

  const [period, setPeriod] = useState("this_month");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: categories = [], isLoading } = useCategoriesQuery();
  const { data: analytics } = useAnalytics(period);
  const { deleteCategory } = useCategoryMutations();

  const spentByName = useMemo(
    () =>
      new Map(
        (analytics?.categoryBreakdown || []).map((item) => [item.name, item.spent])
      ),
    [analytics?.categoryBreakdown]
  );

  const typeCounts = useMemo(
    () => ({
      all: categories.length,
      expense: categories.filter((c) => c.type === "expense").length,
      income: categories.filter((c) => c.type === "income").length,
      both: categories.filter((c) => c.type === "both").length,
    }),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((cat) => {
      if (typeFilter !== "all" && cat.type !== typeFilter) return false;
      if (q && !cat.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categories, search, typeFilter]);

  const breakdown = analytics?.categoryBreakdown || [];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
    } catch (err) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex justify-center items-center">
        <LoadingAnim />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top Filter & Action Bar */}
      <section className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <div className="flex flex-wrap items-center gap-1.5 bg-surface border border-line-subtle p-1 rounded-full">
          {TYPE_FILTERS.map((opt) => {
            const active = typeFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTypeFilter(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                  active
                    ? "bg-tint-active text-ink-primary font-medium"
                    : "text-ink-subtle hover:text-ink-body"
                }`}
              >
                {opt.label} ({typeCounts[opt.key]})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 grow sm:grow-0">
          <div className="flex items-center gap-2 bg-surface border border-line-subtle rounded-full px-3.5 py-2 grow sm:w-56">
            <BiSearch className="text-ink-subtle shrink-0" size={15} />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none w-full"
            />
          </div>

          <Link
            href="/dashboard/budgets"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs sm:text-sm text-ink-body transition-colors"
          >
            <BiSliderAlt size={15} />
            <span>Monthly Budgets</span>
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
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Category Library Grid */}
        <div className="lg:col-span-8 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-normal text-ink-secondary">
              Category Library
            </h2>
            <span className="text-xs text-ink-subtle tabular-nums">
              {filteredCategories.length} shown
            </span>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-subtle">
              No matching categories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCategories.map((cat) => {
                const spent = spentByName.get(cat.name) || 0;
                const hasLimit = Number(cat.monthly_budget) > 0;

                return (
                  <div
                    key={cat.id}
                    className="group rounded-2xl bg-surface border border-line-faint hover:border-line p-4 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-tint text-ink-secondary flex items-center justify-center shrink-0">
                        <RenderIcon
                          icon={cat.icon}
                          name={cat.name}
                          props={{ className: "text-xl" }}
                        />
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm sm:text-base font-normal text-ink-primary truncate">
                          {cat.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
                          <span className="px-2 py-0.5 rounded-full bg-tint-subtle text-ink-muted">
                            {TYPE_LABELS[cat.type] || cat.type}
                          </span>
                          {hasLimit && (
                            <span className="tabular-nums">
                              Cap {cFormat(cat.monthly_budget, { currency })}
                            </span>
                          )}
                          {spent > 0 && (
                            <span className="tabular-nums">
                              · Spent {cFormat(spent, { currency })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => open(AddCategoryPane, { category: cat })}
                        className="p-2 text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full transition-colors cursor-pointer"
                        title={`Edit ${cat.name}`}
                      >
                        <BiEdit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="p-2 text-ink-subtle hover:text-red-100 hover:bg-tint rounded-full transition-colors cursor-pointer"
                        title={`Delete ${cat.name}`}
                      >
                        <BiTrash size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Breakdown Column */}
        <div className="lg:col-span-4 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-normal text-ink-secondary">
              Spending Share
            </h2>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>

          {breakdown.length === 0 ? (
            <div className="py-6 text-center flex flex-col gap-1">
              <span className="text-sm text-ink-subtle">
                No spending recorded in this period
              </span>
              <span className="text-xs text-ink-faint">
                Category shares will appear as you record expenses.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {breakdown.map((item) => (
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
                    <span className="font-medium text-ink-secondary tabular-nums shrink-0">
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

      <ActionModal
        isOpen={Boolean(deleteTarget)}
        content={`Delete category "${deleteTarget?.name}"?`}
        primaryBtnText="Delete"
        secBtnText="Cancel"
        primaryAction={confirmDelete}
        secAction={() => setDeleteTarget(null)}
      />
    </div>
  );
}
