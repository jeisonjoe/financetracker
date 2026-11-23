"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BiArrowBack,
  BiChevronDown,
  BiChevronRight,
  BiEdit,
  BiFilterAlt,
  BiGitMerge,
  BiPlus,
  BiReceipt,
  BiSearch,
  BiSliderAlt,
  BiTrash,
} from "react-icons/bi";
import { toast } from "sonner";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import AddTransactionSidebar from "@/app/(dashboard)/components/AddTransactionSidebar";
import ActionModal from "@/app/components/ActionModal";
import Modal from "@/app/components/Modal";
import Dropdown from "@/app/components/Dropdown";
import LoadingAnim from "@/app/components/LoadingAnim";
import RenderIcon from "@/app/components/RenderIcon";
import CategoryDrilldownChart from "@/app/components/charts/CategoryDrilldownChart";
import CategoryTrendLineChart from "@/app/components/charts/CategoryTrendLineChart";
import SpendingTrendLineChart from "@/app/components/charts/SpendingTrendLineChart";
import { useGlobalPeriod } from "@/app/store/PeriodStore";
import { getPeriodDateBounds } from "@/app/utils/dateBounds";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  useAnalytics,
  useCategoriesQuery,
  useCategoryMutations,
  useTransactionsInfinite,
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
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState(null);
  const [overviewGraphType, setOverviewGraphType] = useState("donut");

  const { data: categories = [], isLoading } = useCategoriesQuery();
  const { data: analytics } = useAnalytics(period);
  const { deleteCategory, mergeCategory } = useCategoryMutations();

  const dateBounds = useMemo(() => getPeriodDateBounds(period), [period]);

  // Transactions feed for selected category
  const { data: catTxData, isLoading: catTxLoading } = useTransactionsInfinite({
    category: selectedCategoryName || "",
    startDate: dateBounds.startDate,
    endDate: dateBounds.endDate,
    pageSize: 50,
  });

  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryName || !catTxData?.pages) return [];
    const all = catTxData.pages.flatMap((page) => page.items || []);
    if (!selectedSubcategoryName) return all;
    return all.filter((t) => {
      const sub = t.subcategory?.name || t.subcategory || t.transaction?.subcategory?.name;
      return sub && String(sub).toLowerCase() === String(selectedSubcategoryName).toLowerCase();
    });
  }, [catTxData, selectedCategoryName, selectedSubcategoryName]);

  const activeParentObj = useMemo(() => {
    if (!selectedCategoryName) return null;
    return categories.find((c) => c.name === selectedCategoryName && !c.parent_id && !c.parentId) || null;
  }, [categories, selectedCategoryName]);

  const activeBreakdownObj = useMemo(() => {
    if (!selectedCategoryName) return null;
    return analytics?.categoryBreakdown?.find((c) => c.name === selectedCategoryName) || null;
  }, [analytics?.categoryBreakdown, selectedCategoryName]);

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
        <div className="lg:col-span-7 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
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
                const isSelected = selectedCategoryName === parent.name;

                return (
                  <div
                    key={parent.id}
                    className={`rounded-2xl bg-surface border transition-all overflow-hidden ${
                      isSelected
                        ? "border-ink-secondary/40 ring-1 ring-ink-secondary/20 shadow-sm"
                        : "border-line-faint hover:border-line"
                    }`}
                  >
                    {/* Parent Header Row */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div
                        className="flex items-center gap-3.5 min-w-0 cursor-pointer group/title grow"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryName(null);
                            setSelectedSubcategoryName(null);
                          } else {
                            setSelectedCategoryName(parent.name);
                            setSelectedSubcategoryName(null);
                          }
                        }}
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover/title:scale-105"
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
                            <span className="text-sm sm:text-base font-medium text-ink-primary truncate group-hover/title:text-ink-secondary">
                              {parent.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-tint text-[11px] text-ink-secondary border border-line-subtle shrink-0 font-medium">
                              {TYPE_LABELS[parent.type] || parent.type}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full bg-tint-active text-[10px] text-ink-primary border border-line-strong font-medium shrink-0">
                                Active View
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                            {hasLimit && (
                              <span className="tabular-nums">
                                Cap {cFormat(parent.monthly_budget, { currency })}
                              </span>
                            )}
                            {spent > 0 && (
                              <span className="tabular-nums text-ink-body">
                                · Spent {cFormat(spent, { currency })}
                              </span>
                            )}
                            {hasLimit && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  spent > Number(parent.monthly_budget)
                                    ? "bg-red-500/10 text-red-700"
                                    : Math.round((spent / Number(parent.monthly_budget)) * 100) >
                                      Math.round((new Date().getDate() / 30) * 100) + 15
                                    ? "bg-amber-500/10 text-amber-700"
                                    : "bg-emerald-500/10 text-emerald-700"
                                }`}
                              >
                                {spent > Number(parent.monthly_budget)
                                  ? "Exhausted"
                                  : Math.round((spent / Number(parent.monthly_budget)) * 100) >
                                    Math.round((new Date().getDate() / 30) * 100) + 15
                                  ? `Fast Pace (${Math.round((spent / Number(parent.monthly_budget)) * 100)}%)`
                                  : "On Track"}
                              </span>
                            )}
                            <span className="text-ink-subtle">
                              · {subs.length} {subs.length === 1 ? "subcategory" : "subcategories"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Parent Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCategoryName(null);
                              setSelectedSubcategoryName(null);
                            } else {
                              setSelectedCategoryName(parent.name);
                              setSelectedSubcategoryName(null);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-tint-active text-ink-primary border-line-strong font-medium"
                              : "text-ink-secondary hover:text-ink-primary bg-surface hover:bg-surface-hover border-line-subtle hover:border-line font-medium"
                          }`}
                          title={`View transactions for ${parent.name}`}
                        >
                          <BiReceipt size={14} />
                          <span className="hidden sm:inline">{isSelected ? "Close" : "Transactions"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            open(AddCategoryPane, {
                              defaultParentId: parent.id,
                              isSubcategory: true,
                            })
                          }
                          className="px-2 py-1 text-xs text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full border border-line-subtle transition-colors cursor-pointer inline-flex items-center gap-0.5"
                          title={`Add subcategory under ${parent.name}`}
                        >
                          <BiPlus size={14} />
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
                            const isSubSelected =
                              isSelected && selectedSubcategoryName === sub.name;

                            return (
                              <div
                                key={sub.id}
                                className={`group/sub flex items-center justify-between gap-2 p-2.5 bg-surface border rounded-xl transition-colors ${
                                  isSubSelected
                                    ? "border-ink-secondary/50 ring-1 ring-ink-secondary/25 bg-surface-elevated/60"
                                    : "border-line-subtle hover:border-line"
                                }`}
                              >
                                <div
                                  className="flex items-center gap-2 min-w-0 cursor-pointer grow"
                                  onClick={() => {
                                    setSelectedCategoryName(parent.name);
                                    setSelectedSubcategoryName(
                                      isSubSelected ? null : sub.name
                                    );
                                  }}
                                >
                                  <span className="text-ink-muted text-xs shrink-0">↳</span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium text-ink-primary truncate">
                                      {sub.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                                      {subBudget > 0 && (
                                        <span className="tabular-nums">
                                          Cap {cFormat(subBudget, { currency })}
                                        </span>
                                      )}
                                      {subSpent > 0 && (
                                        <span className="tabular-nums text-ink-body">
                                          Spent {cFormat(subSpent, { currency })}
                                        </span>
                                      )}
                                      {subBudget > 0 && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                            subSpent > subBudget
                                              ? "bg-red-500/10 text-red-700"
                                              : Math.round((subSpent / subBudget) * 100) >
                                                Math.round((new Date().getDate() / 30) * 100) + 15
                                              ? "bg-amber-500/10 text-amber-700"
                                              : "bg-emerald-500/10 text-emerald-700"
                                          }`}
                                        >
                                          {subSpent > subBudget
                                            ? "Exceeded"
                                            : `${Math.round((subSpent / subBudget) * 100)}%`}
                                        </span>
                                      )}
                                      {subBudget === 0 && subSpent === 0 && (
                                        <span className="text-ink-subtle">No limit</span>
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

        {/* Right Column: Dynamic Master-Detail (Category Transactions Inspector OR Spending Share) */}
        <div className="lg:col-span-5 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4 sticky top-6">
          {selectedCategoryName ? (
            /* Selected Category Inspector */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-line-faint">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor:
                        activeParentObj?.color || activeParentObj?.icon?.color
                          ? `${activeParentObj.color || activeParentObj.icon?.color}15`
                          : "var(--tint)",
                      borderColor:
                        activeParentObj?.color || activeParentObj?.icon?.color
                          ? `${activeParentObj.color || activeParentObj.icon?.color}40`
                          : "transparent",
                      color:
                        activeParentObj?.color ||
                        activeParentObj?.icon?.color ||
                        "var(--ink-secondary)",
                    }}
                  >
                    <RenderIcon
                      icon={activeParentObj?.icon}
                      name={activeParentObj?.name || selectedCategoryName}
                      props={{ className: "text-lg" }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-base font-medium text-ink-primary truncate">
                      {selectedCategoryName}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {selectedSubcategoryName
                        ? `Filtered: ${selectedSubcategoryName}`
                        : "Contributing Transactions"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryName(null);
                    setSelectedSubcategoryName(null);
                  }}
                  className="px-3 py-1.5 text-xs text-ink-secondary hover:text-ink-primary hover:bg-surface-hover rounded-full border border-line-subtle transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 font-medium"
                >
                  <BiArrowBack size={14} />
                  <span>Overview</span>
                </button>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-surface border border-line-faint">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-ink-muted">Period Spend</span>
                  <span className="text-base font-medium text-ink-primary tabular-nums">
                    {cFormat(
                      activeBreakdownObj?.spent || spentByName.get(selectedCategoryName) || 0,
                      { currency }
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-ink-muted">Monthly Budget</span>
                  <span className="text-base font-medium text-ink-primary tabular-nums">
                    {Number(activeParentObj?.monthly_budget) > 0
                      ? cFormat(activeParentObj.monthly_budget, { currency })
                      : "No limit set"}
                  </span>
                </div>
              </div>

              {/* Subcategory Filter Pills */}
              {(subcategoriesByParentId.get(String(activeParentObj?.id)) || []).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategoryName(null)}
                    className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                      !selectedSubcategoryName
                        ? "bg-tint-active text-ink-primary border border-line-strong font-medium"
                        : "text-ink-secondary hover:text-ink-primary bg-surface hover:bg-surface-hover border border-line-subtle hover:border-line"
                    }`}
                  >
                    All
                  </button>
                  {(subcategoriesByParentId.get(String(activeParentObj?.id)) || []).map((sub) => {
                    const isSubActive = selectedSubcategoryName === sub.name;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() =>
                          setSelectedSubcategoryName(isSubActive ? null : sub.name)
                        }
                        className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                          isSubActive
                            ? "bg-tint-active text-ink-primary border border-line-strong font-medium"
                            : "text-ink-secondary hover:text-ink-primary bg-surface hover:bg-surface-hover border border-line-subtle hover:border-line"
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Category-Specific Spending Trend Line Graph */}
              {selectedCategoryTransactions.length > 0 && (
                <CategoryTrendLineChart
                  transactions={selectedCategoryTransactions}
                  currency={currency}
                  categoryName={selectedCategoryName}
                  budget={activeParentObj?.monthly_budget}
                  height={130}
                />
              )}

              {/* Contributing Transactions List */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-secondary">Transactions ({selectedCategoryTransactions.length})</span>
                  <span className="text-ink-muted">Click any item to edit</span>
                </div>

                {catTxLoading ? (
                  <div className="py-12 flex justify-center">
                    <LoadingAnim />
                  </div>
                ) : selectedCategoryTransactions.length === 0 ? (
                  <div className="py-8 text-center flex flex-col gap-1 rounded-xl bg-surface border border-line-faint p-4">
                    <span className="text-xs text-ink-muted">No transactions found for this selection</span>
                    <span className="text-xs text-ink-subtle">
                      Transactions in this category will appear here.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[440px] overflow-y-auto scrollbar-minimal pr-1">
                    {selectedCategoryTransactions.map((tx) => {
                      const subName = tx.subcategory?.name || tx.subcategory || "";
                      const txDate = tx.created_at || tx.date;
                      const formattedDate = txDate
                        ? new Date(txDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "";
                      const isExpense = tx.type === "expense";

                      return (
                        <div
                          key={tx.id}
                          onClick={() => open(AddTransactionSidebar, { transaction: tx })}
                          className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-line-faint hover:border-line hover:bg-surface-elevated/60 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs sm:text-sm font-medium text-ink-primary truncate">
                                {tx.payee || tx.description || tx.category?.name || "Transaction"}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                                {formattedDate && <span>{formattedDate}</span>}
                                {subName && (
                                  <span className="text-ink-secondary">· {subName}</span>
                                )}
                                {tx.wallet?.name && (
                                  <span className="text-ink-subtle">· {tx.wallet.name}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs sm:text-sm font-medium tabular-nums ${
                                isExpense ? "text-ink-primary" : "text-emerald-500"
                              }`}
                            >
                              {isExpense ? "-" : "+"}
                              {cFormat(tx.amount, { currency })}
                            </span>
                            <BiChevronRight
                              size={15}
                              className="text-ink-subtle group-hover:text-ink-secondary transition-colors"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-line-faint flex items-center justify-between">
                <Link
                  href={`/dashboard/transactions?category=${encodeURIComponent(selectedCategoryName)}`}
                  className="text-xs text-ink-subtle hover:text-ink-primary transition-colors inline-flex items-center gap-1"
                >
                  <span>Open in Transactions Tab</span>
                  <BiChevronRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            /* Default: Spending Share & Category Breakdown */
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                  <h2 className="text-base font-normal text-ink-secondary">
                    {overviewGraphType === "donut" ? "Spending Share" : "Daily Spend Progression"}
                  </h2>
                  <span className="text-[11px] text-ink-subtle">
                    {overviewGraphType === "donut"
                      ? "Click a category slice to drill down"
                      : "Cumulative expense curve over selected period"}
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-surface p-0.5 rounded-full border border-line-subtle text-xs">
                  <button
                    type="button"
                    onClick={() => setOverviewGraphType("donut")}
                    className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      overviewGraphType === "donut"
                        ? "bg-tint-active text-ink-primary font-medium"
                        : "text-ink-muted hover:text-ink-secondary"
                    }`}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverviewGraphType("line")}
                    className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      overviewGraphType === "line"
                        ? "bg-tint-active text-ink-primary font-medium"
                        : "text-ink-muted hover:text-ink-secondary"
                    }`}
                  >
                    Trend Line
                  </button>
                </div>
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
                    {overviewGraphType === "donut" ? (
                      <CategoryDrilldownChart
                        categories={breakdown}
                        currency={currency}
                        height={200}
                        cutout="70%"
                      />
                    ) : (
                      <SpendingTrendLineChart
                        dailyTrend={analytics?.dailyTrend || []}
                        currency={currency}
                        height={180}
                      />
                    )}
                  </div>

                  {breakdown.map((item) => (
                    <div
                      key={item.name}
                      onClick={() => setSelectedCategoryName(item.name)}
                      className="flex flex-col gap-1.5 p-2 rounded-xl hover:bg-surface transition-colors cursor-pointer group/item"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <RenderIcon
                            icon={item.icon}
                            name={item.name}
                            props={{ className: "text-base text-ink-muted shrink-0" }}
                          />
                          <span className="text-ink-body font-medium truncate group-hover/item:text-ink-primary">
                            {item.name}
                          </span>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCategoryName(item.name);
                                  setSelectedSubcategoryName(sub.name);
                                }}
                                className="flex items-center justify-between text-[11px] text-ink-subtle hover:text-ink-primary transition-colors"
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
