"use client";

import { useMemo, useState } from "react";
import { BiEdit, BiPlus, BiSearch, BiTrash } from "react-icons/bi";
import { toast } from "sonner";
import RenderIcon from "@/app/components/RenderIcon";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import {
  useAnalytics,
  useCategoriesQuery,
  useCategoryMutations,
} from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import { cFormat } from "@/app/utils/currencyFormat";
import LoadingAnim from "@/app/components/LoadingAnim";
import ActionModal from "@/app/components/ActionModal";

export default function Page() {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { open } = useRhsSidebarStore();
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const { data: categories = [], isLoading } = useCategoriesQuery();
  const { data: analytics } = useAnalytics("this_month");
  const { deleteCategory } = useCategoryMutations();

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-[calc(100vh-160px)] min-h-[480px]">
      <div className="lg:col-span-7 bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-4 min-h-0">
        <div className="w-full flex flex-wrap items-center gap-3">
          <div className="grow bg-surface border border-white/[0.06] flex items-center rounded-full px-4 py-2.5 gap-2 min-w-[200px]">
            <BiSearch className="text-zinc-500 shrink-0" size={16} />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none w-full"
            />
          </div>

          <button
            type="button"
            className="bg-zinc-100 hover:bg-white text-zinc-950 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors"
            onClick={() => open(AddCategoryPane)}
          >
            <BiPlus size={18} />
            New Category
          </button>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto scrollbar-minimal grow pr-1">
          {filteredCategories.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-12">
              No matching categories found.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="group flex justify-between items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] text-zinc-200 flex items-center justify-center shrink-0">
                    <RenderIcon icon={cat.icon} props={{ className: "text-xl" }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm sm:text-base font-normal text-zinc-200 truncate">
                      {cat.name}
                    </span>
                    <span className="text-xs text-zinc-500 capitalize">
                      {cat.type}
                      {cat.monthly_budget > 0
                        ? ` • Budget ${cFormat(cat.monthly_budget, { currency })}`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => open(AddCategoryPane, { category: cat })}
                    className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer"
                    title="Edit category"
                  >
                    <BiEdit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(cat)}
                    className="p-2 text-zinc-500 hover:text-red-100 hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <BiTrash size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-5 bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-normal text-zinc-200">
            This Month Breakdown
          </h2>
          <span className="text-xs text-zinc-500">
            {breakdown.length} active
          </span>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-minimal grow pr-1">
          {breakdown.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-12">
              No category spending recorded this month.
            </div>
          ) : (
            breakdown.map((item) => (
              <div key={item.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-normal text-zinc-300">{item.name}</span>
                  <span className="font-medium text-zinc-200">
                    {cFormat(item.spent, { currency })} ({item.sharePercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, item.sharePercent)}%` }}
                  />
                </div>
              </div>
            ))
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
