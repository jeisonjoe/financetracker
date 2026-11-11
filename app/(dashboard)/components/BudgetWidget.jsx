"use client";

import { useState } from "react";
import { cFormat } from "@/app/utils/currencyFormat";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import PeriodSelector from "@/app/components/PeriodSelector";
import RenderIcon from "@/app/components/RenderIcon";

export default function BudgetWidget({ limit = 6 }) {
  const [period, setPeriod] = useState("this_month");
  const { data, isLoading } = useAnalytics(period);
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const categories = (data?.categoryBreakdown || []).slice(0, limit);

  return (
    <div className="flex flex-col gap-4 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 h-full min-h-[380px]">
      <div className="flex justify-between items-center gap-2">
        <span className="text-lg text-ink-secondary font-normal">
          Spending Analysis
        </span>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="overflow-y-auto w-full scrollbar-minimal grow pr-1">
        {isLoading ? (
          <div className="flex flex-col gap-4 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 w-full bg-surface-elevated rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-ink-subtle text-sm py-16">
            No expenses in this period
          </div>
        ) : (
          categories.map((item) => {
            const hasBudget = item.budget > 0;
            const barWidth = hasBudget ? item.budgetPercent : item.sharePercent;
            const barColor = item.overBudget
              ? "bg-red-100"
              : item.sharePercent > 50
              ? "bg-accent"
              : "bg-ink-muted";

            return (
              <div
                key={item.id || item.name}
                className="flex flex-col gap-2.5 py-4 border-b border-line-faint w-full last-of-type:border-b-0"
              >
                <div className="flex justify-between items-center w-full gap-3">
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="w-9 h-9 bg-tint rounded-full text-ink-body flex items-center justify-center shrink-0">
                      <RenderIcon icon={item.icon} name={item.name} props={{ className: "text-lg" }} />
                    </div>
                    <span className="text-sm sm:text-base font-normal text-ink-secondary truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 text-ink-secondary font-medium shrink-0 tabular-nums">
                    <span className="text-base">
                      {cFormat(item.spent, { currency })}
                    </span>
                    {hasBudget && (
                      <span className="text-xs text-ink-subtle font-normal">
                        / {cFormat(item.budget, { currency })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-ink-subtle">
                    <span>
                      {hasBudget
                        ? `${item.budgetPercent}% of budget`
                        : `${item.sharePercent}% of period spend`}
                    </span>
                    {item.overBudget && (
                      <span className="text-red-100 font-medium">Over budget</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-tint overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, barWidth)}%` }}
                      className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
