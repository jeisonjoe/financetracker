"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BiChevronDown, BiEdit, BiGitMerge, BiPlus, BiSearch, BiSliderAlt, BiTrash } from "react-icons/bi";
import { toast } from "sonner";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import ActionModal from "@/app/components/ActionModal";
import Modal from "@/app/components/Modal";
import Dropdown from "@/app/components/Dropdown";
import LoadingAnim from "@/app/components/LoadingAnim";
import RenderIcon from "@/app/components/RenderIcon";
import CategoryDoughnutChart from "@/app/components/charts/CategoryDoughnutChart";
import { useGlobalPeriod } from "@/app/store/PeriodStore";
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

  const { period } = useGlobalPeriod();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedParents, setExpandedParents] = useState(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [merging, setMerging] = useState(false);

  const { data: categories = [], isLoading } = useCategoriesQuery();
  const { data: analytics } = useAnalytics(period);
  const { deleteCategory, mergeCategory } = useCategoryMutations();

  const handleMerge = async () => {
    if (!mergeSource || !mergeTarget) {
      toast.error("Please select both source and target categories");
      return;
    }
    if (mergeSource === mergeTarget) {
      toast.error("Source and target categories must be different");
      return;
    }
    setMerging(true);
    try {
      await mergeCategory.mutateAsync({
        sourceId: mergeSource,
        targetId: mergeTarget,
      });
      toast.success("Categories merged successfully");
      setMergeOpen(false);
      setMergeSource("");
      setMergeTarget("");
    } catch (err) {
      toast.error(err.message || "Failed to merge categories");
    } finally {
      setMerging(false);
    }
  };

  // Spend maps from analytics breakdown
  const spentByName = useMemo(
    () =>
      new Map(
        (analytics?.categoryBreakdown || []).map((item) => [item.name, item.spent])
      ),
    [analytics?.categoryBreakdown]
  );

  const subSpentMap = useMemo(() => {
    const map = new Map();
    for (const cat of analytics?.categoryBreakdown || []) {
      for (const sub of cat.subcategories || []) {
        map.set(`${cat.name}:::${sub.name}`, sub.spent);
      }
    }
    return map;
  }, [analytics?.categoryBreakdown]);

  // Group into parent categories and child subcategories
  const { parentCategories, subcategoriesByParentId } = useMemo(() => {
    const parents = [];
    const childrenMap = new Map();

    for (const cat of categories) {
      if (!cat.parent_id && !cat.parentId) {
        parents.push(cat);
      } else {
        const pId = String(cat.parent_id || cat.parentId);
        if (!childrenMap.has(pId)) {
          childrenMap.set(pId, []);
        }
        childrenMap.get(pId).push(cat);
      }
    }

    return {
      parentCategories: parents,
      subcategoriesByParentId: childrenMap,
    };
  }, [categories]);

  const typeCounts = useMemo(
    () => ({
      all: parentCategories.length,
      expense: parentCategories.filter((c) => c.type === "expense").length,
      income: parentCategories.filter((c) => c.type === "income").length,
      both: parentCategories.filter((c) => c.type === "both").length,
    }),
    [parentCategories]
  );

  const filteredParents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parentCategories.filter((parent) => {
      if (typeFilter !== "all" && parent.type !== typeFilter) return false;
      if (!q) return true;

      const parentMatch = parent.name.toLowerCase().includes(q);
      const subs = subcategoriesByParentId.get(String(parent.id)) || [];
      const subMatch = subs.some((s) => s.name.toLowerCase().includes(q));

      return parentMatch || subMatch;
    });
  }, [parentCategories, subcategoriesByParentId, search, typeFilter]);

  const breakdown = analytics?.categoryBreakdown || [];

  const toggleExpand = (parentId) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

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
              placeholder="Search category or subcategory..."
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
            onClick={() => setMergeOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs sm:text-sm text-ink-body transition-colors cursor-pointer"
          >
            <BiGitMerge size={15} />
            <span>Merge Categories</span>
          </button>

          <button
            type="button"
            onClick={() => open(AddCategoryPane, { isSubcategory: false })}
            className="bg-cta hover:bg-cta-hover text-cta-ink inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <BiPlus size={17} />
            <span>New Category</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Category Library Column */}
        <div className="lg:col-span-8 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-normal text-ink-secondary">
              Categories &amp; Subcategories
            </h2>
            <span className="text-xs text-ink-subtle tabular-nums">
              {filteredParents.length} categories shown
            </span>
          </div>

          {filteredParents.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-subtle">
              No matching categories or subcategories found.
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {filteredParents.map((parent) => {
                const subs = subcategoriesByParentId.get(String(parent.id)) || [];
                const spent = spentByName.get(parent.name) || 0;
                const hasLimit = Number(parent.monthly_budget) > 0;
                const isExpanded = expandedParents.has(parent.id) || Boolean(search.trim());

                return (
                  <div
                    key={parent.id}
                    className="rounded-2xl bg-surface border border-line-faint hover:border-line transition-colors overflow-hidden"
                  >
                    {/* Parent Header Row */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: parent.color || parent.icon?.color ? `${parent.color || parent.icon?.color}15` : "var(--tint)",
                            borderColor: parent.color || parent.icon?.color ? `${parent.color || parent.icon?.color}40` : "transparent",
                            color: parent.color || parent.icon?.color || "var(--ink-secondary)",
                          }}
                        >
                          <RenderIcon
                            icon={parent.icon}
                            name={parent.name}
                            props={{ className: "text-xl" }}
                          />
                        </div>

                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-medium text-ink-primary truncate">
                              {parent.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-tint-subtle text-[11px] text-ink-muted shrink-0">
                              {TYPE_LABELS[parent.type] || parent.type}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                            {hasLimit && (
                              <span className="tabular-nums">
                                Cap {cFormat(parent.monthly_budget, { currency })}
                              </span>
                            )}
                            {spent > 0 && (
                              <span className="tabular-nums">
                                · Spent {cFormat(spent, { currency })}
                              </span>
                            )}
                            <span className="text-ink-faint">
                              · {subs.length} {subs.length === 1 ? "subcategory" : "subcategories"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Parent Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            open(AddCategoryPane, {
                              defaultParentId: parent.id,
                              isSubcategory: true,
                            })
                          }
                          className="px-2.5 py-1 text-xs text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full border border-line-subtle transition-colors cursor-pointer inline-flex items-center gap-1"
                          title={`Add subcategory under ${parent.name}`}
                        >
                          <BiPlus size={14} />
                          <span className="hidden sm:inline">Subcategory</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => open(AddCategoryPane, { category: parent })}
                          className="p-1.5 text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full transition-colors cursor-pointer"
                          title={`Edit ${parent.name}`}
                        >
                          <BiEdit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(parent)}
                          className="p-1.5 text-ink-subtle hover:text-red-100 hover:bg-tint rounded-full transition-colors cursor-pointer"
                          title={`Delete ${parent.name}`}
                        >
                          <BiTrash size={16} />
                        </button>
                        {subs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(parent.id)}
                            className="p-1.5 text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                          >
                            <BiChevronDown
                              size={18}
                              className={`transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subcategories Nested List */}
                    {subs.length > 0 && isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 border-t border-line-faint bg-surface-elevated/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {subs.map((sub) => {
                            const subSpent =
                              subSpentMap.get(`${parent.name}:::${sub.name}`) || 0;
                            const subBudget = Number(sub.monthly_budget) || 0;

                            return (
                              <div
                                key={sub.id}
                                className="group/sub flex items-center justify-between gap-2 p-2.5 bg-surface border border-line-subtle rounded-xl hover:border-line transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-ink-subtle text-xs shrink-0">↳</span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium text-ink-body truncate">
                                      {sub.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[11px] text-ink-subtle">
                                      {subBudget > 0 && (
                                        <span className="tabular-nums">
                                          Cap {cFormat(subBudget, { currency })}
                                        </span>
                                      )}
                                      {subSpent > 0 && (
                                        <span className="tabular-nums text-ink-muted">
                                          Spent {cFormat(subSpent, { currency })}
                                        </span>
                                      )}
                                      {subBudget === 0 && subSpent === 0 && (
                                        <span className="text-ink-faint">No limit</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover/sub:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      open(AddCategoryPane, {
                                        category: sub,
                                        isSubcategory: true,
                                      })
                                    }
                                    className="p-1 text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full transition-colors cursor-pointer"
                                    title={`Edit ${sub.name}`}
                                  >
                                    <BiEdit size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(sub)}
                                    className="p-1 text-ink-subtle hover:text-red-100 hover:bg-tint rounded-full transition-colors cursor-pointer"
                                    title={`Delete ${sub.name}`}
                                  >
                                    <BiTrash size={14} />
                                  </button>
                                </div>
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
        </div>

        {/* Right: Spending Share & Subcategory Drill-down */}
        <div className="lg:col-span-4 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-normal text-ink-secondary">
              Spending Share
            </h2>
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
            <div className="flex flex-col gap-4">
              <div className="pb-2 border-b border-line-faint">
                <CategoryDoughnutChart
                  categories={breakdown}
                  currency={currency}
                  height={160}
                  cutout="70%"
                />
              </div>

              {breakdown.map((item) => (
                <div key={item.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <RenderIcon
                        icon={item.icon}
                        name={item.name}
                        props={{ className: "text-base text-ink-muted shrink-0" }}
                      />
                      <span className="text-ink-body font-medium truncate">{item.name}</span>
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

                  {/* Subcategories Breakdown */}
                  {item.subcategories?.length > 0 && (
                    <div className="flex flex-col pl-3 pt-1 gap-1 border-l border-line-faint ml-2">
                      {item.subcategories.slice(0, 4).map((sub) => {
                        const subShare =
                          item.spent > 0 ? Math.round((sub.spent / item.spent) * 100) : 0;
                        return (
                          <div
                            key={sub.name}
                            className="flex items-center justify-between text-[11px] text-ink-subtle"
                          >
                            <span className="truncate">↳ {sub.name}</span>
                            <span className="tabular-nums font-mono text-ink-muted shrink-0">
                              {cFormat(sub.spent, { currency })} ({subShare}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={Boolean(deleteTarget)}
        content={
          deleteTarget?.parent_id || deleteTarget?.parentId
            ? `Delete subcategory "${deleteTarget?.name}"?`
            : `Delete category "${deleteTarget?.name}"? Any subcategories under it will also be deleted.`
        }
        primaryBtnText="Delete"
        secBtnText="Cancel"
        primaryAction={confirmDelete}
        secAction={() => setDeleteTarget(null)}
      />

      {/* Merge Categories Modal */}
      <Modal
        isOpen={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title="Merge Categories"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-subtle">
            Select a source category to merge into a target category. All past transactions and child subcategories from the source will be safely reassigned to the target category, and the source category will be removed.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-normal text-ink-subtle pl-1">
              Source Category (to be deleted)
            </label>
            <Dropdown
              options={parentCategories.map((p) => ({
                key: String(p.id),
                name: p.name,
              }))}
              value={
                parentCategories.find((p) => String(p.id) === String(mergeSource))
                  ? {
                      key: String(mergeSource),
                      name: parentCategories.find((p) => String(p.id) === String(mergeSource))?.name,
                    }
                  : { key: "", name: "Select source category" }
              }
              onChange={(opt) => setMergeSource(opt.key)}
              placeholder="Select source"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-normal text-ink-subtle pl-1">
              Target Category (to keep)
            </label>
            <Dropdown
              options={parentCategories
                .filter((p) => String(p.id) !== String(mergeSource))
                .map((p) => ({
                  key: String(p.id),
                  name: p.name,
                }))}
              value={
                parentCategories.find((p) => String(p.id) === String(mergeTarget))
                  ? {
                      key: String(mergeTarget),
                      name: parentCategories.find((p) => String(p.id) === String(mergeTarget))?.name,
                    }
                  : { key: "", name: "Select target category" }
              }
              onChange={(opt) => setMergeTarget(opt.key)}
              placeholder="Select target"
            />
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-line-subtle">
            <button
              type="button"
              onClick={() => setMergeOpen(false)}
              className="flex-1 py-2.5 rounded-full bg-surface-elevated text-xs font-normal text-ink-body hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMerge}
              disabled={merging || !mergeSource || !mergeTarget}
              className="flex-1 py-2.5 rounded-full bg-cta text-cta-ink text-xs font-medium hover:bg-cta-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {merging ? "Merging..." : "Confirm Merge"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
