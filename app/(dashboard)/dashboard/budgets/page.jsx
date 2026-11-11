"use client";

import { useState } from "react";
import Link from "next/link";
import BudgetWidget from "../../components/BudgetWidget";
import {
  useAnalytics,
  useCategoriesQuery,
  useCategoryMutations,
  usePlanningOverview,
} from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import { cFormat } from "@/app/utils/currencyFormat";
import { toast } from "sonner";
import RenderIcon from "@/app/components/RenderIcon";

export default function Page() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const { data: categories = [] } = useCategoriesQuery();
  const { data: analytics } = useAnalytics("this_month");
  const { data: planning } = usePlanningOverview();
  const { updateCategory } = useCategoryMutations();
  const [draftBudgets, setDraftBudgets] = useState({});

  const expenseCategories = categories.filter((c) => c.type !== "income");
  const spentByName = new Map(
    (analytics?.categoryBreakdown || []).map((c) => [c.name, c.spent])
  );

  const totalBudget = expenseCategories.reduce(
    (sum, c) => sum + (Number(c.monthly_budget) || 0),
    0
  );
  const totalSpent = analytics?.summary?.expense || 0;
  const cashflow = planning?.cashflow;

  const handleSaveBudget = async (cat) => {
    const raw = draftBudgets[cat.id];
    const nextBudget = raw !== undefined ? Number(raw) || 0 : cat.monthly_budget;
    try {
      await updateCategory.mutateAsync({
        id: cat.id,
        payload: { monthly_budget: nextBudget },
      });
      toast.success(`Updated budget for ${cat.name}`);
    } catch (err) {
      toast.error(err.message || "Failed to update budget");
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      {cashflow && (
        <div className="bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-zinc-500">Planned Income</div>
              <div className="text-base font-medium text-zinc-200 mt-0.5">
                {cashflow.plannedIncome > 0
                  ? cFormat(cashflow.plannedIncome, { currency })
                  : "Not set"}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Category Budgets</div>
              <div className="text-base font-medium text-zinc-200 mt-0.5">
                {cFormat(totalBudget, { currency })}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Goal Savings / mo</div>
              <div className="text-base font-medium text-zinc-200 mt-0.5">
                {cFormat(cashflow.plannedGoalSavings, { currency })}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Unallocated Margin</div>
              <div
                className={`text-base font-medium mt-0.5 ${
                  cashflow.freeToAllocate < 0 ? "text-red-100" : "text-green-100"
                }`}
              >
                {cFormat(cashflow.freeToAllocate, { currency })}
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/planning"
            className="px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-white/[0.06] text-xs text-zinc-300 transition-colors"
          >
            Adjust Cashflow Plan
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5">
        <BudgetWidget limit={12} />
      </div>

      <div className="lg:col-span-7 bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-5 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-normal text-zinc-200">
              Monthly Category Limits
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set monthly caps per category to power your daily spending pace.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Total Spent / Budgeted</div>
            <div className="text-base font-medium text-zinc-200">
              {cFormat(totalSpent, { currency })} /{" "}
              {totalBudget > 0
                ? cFormat(totalBudget, { currency })
                : "No limits set"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[58vh] overflow-y-auto scrollbar-minimal pr-1">
          {expenseCategories.map((cat) => {
            const spent = spentByName.get(cat.name) || 0;
            const currentVal =
              draftBudgets[cat.id] !== undefined
                ? draftBudgets[cat.id]
                : String(cat.monthly_budget || "");

            return (
              <div
                key={cat.id}
                className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-white/[0.04]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] text-zinc-200 flex items-center justify-center shrink-0">
                    <RenderIcon icon={cat.icon} props={{ className: "text-lg" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-normal text-zinc-200 truncate">
                      {cat.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Spent this month: {cFormat(spent, { currency })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    placeholder="0"
                    value={currentVal}
                    onChange={(e) =>
                      setDraftBudgets((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                    className="w-28 bg-surface-elevated border border-white/[0.08] rounded-full px-3.5 py-1.5 text-sm text-zinc-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveBudget(cat)}
                    className="px-4 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-xs font-medium cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}
