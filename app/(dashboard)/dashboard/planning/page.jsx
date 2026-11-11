"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BiCalendarCheck, BiPieChartAlt2, BiTargetLock } from "react-icons/bi";
import { useAuth } from "@/app/contexts/AuthContext";
import { usePlanningOverview } from "@/app/hooks/useFinanceData";
import CashflowSection from "./components/CashflowSection";
import GoalsSection from "./components/GoalsSection";
import RecurringSection from "./components/RecurringSection";

const TABS = [
  { key: "cashflow", label: "Cashflow & Allocation", icon: BiPieChartAlt2 },
  { key: "goals", label: "Savings Goals", icon: BiTargetLock },
  { key: "recurring", label: "Recurring Bills & Income", icon: BiCalendarCheck },
];

function PlanningContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.key === initialTab) ? initialTab : "cashflow"
  );

  useEffect(() => {
    if (initialTab && TABS.some((t) => t.key === initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const { data: planning, isLoading } = usePlanningOverview();

  const activeGoalsCount = planning?.goalsSummary?.activeCount || 0;
  const attentionBillsCount =
    (planning?.recurringSummary?.overdueCount || 0) +
    (planning?.recurringSummary?.dueSoonCount || 0);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap bg-surface-elevated/60 border border-line-subtle p-1 rounded-full gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            const badge =
              tab.key === "goals" && activeGoalsCount > 0
                ? activeGoalsCount
                : tab.key === "recurring" && attentionBillsCount > 0
                ? attentionBillsCount
                : null;

            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-normal flex items-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                  active
                    ? "bg-cta text-cta-ink font-medium"
                    : "text-ink-muted hover:text-ink-primary hover:bg-tint-subtle"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] leading-none tabular-nums ${
                      active
                        ? "bg-cta-badge text-cta-badge-ink"
                        : tab.key === "recurring" &&
                          (planning?.recurringSummary?.overdueCount || 0) > 0
                        ? "bg-red-10 text-red-100"
                        : "bg-tint-hover text-ink-body"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 bg-surface-elevated rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div key={activeTab} className="animate-fade-up">
          {activeTab === "goals" ? (
            <GoalsSection planning={planning} currency={currency} />
          ) : activeTab === "recurring" ? (
            <RecurringSection planning={planning} currency={currency} />
          ) : (
            <CashflowSection
              planning={planning}
              currency={currency}
              onNavigateTab={setActiveTab}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-48 bg-surface-elevated rounded-2xl animate-pulse" />
      }
    >
      <PlanningContent />
    </Suspense>
  );
}
