"use client";

import Link from "next/link";
import { BiBell, BiMenu } from "react-icons/bi";
import { usePathname } from "next/navigation";
import AddTransactionSidebar from "./AddTransactionSidebar";
import { nav, navBottom } from "@/app/utils/navItems";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { usePlanningOverview } from "@/app/hooks/useFinanceData";
import RhsSidebar from "@/app/components/RhsSidebar";

export default function Header({ onOpenMobileNav }) {
  const { open } = useRhsSidebarStore();
  const pathname = usePathname();
  const { data: planning } = usePlanningOverview();

  const navItems = [...nav, ...navBottom];
  const currentPath = navItems.find((item) => item.url === pathname);
  const pageTitle = currentPath?.name || "Overview";

  const overdueCount = planning?.recurringSummary?.overdueCount || 0;
  const dueSoonCount = planning?.recurringSummary?.dueSoonCount || 0;
  const attentionCount = overdueCount + dueSoonCount;

  return (
    <>
      <header className="flex w-full pb-6 items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileNav && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              className="lg:hidden p-2 rounded-xl bg-surface-elevated text-ink-body cursor-pointer"
              aria-label="Open navigation"
            >
              <BiMenu size={20} />
            </button>
          )}
          <h2 className="text-2xl sm:text-3xl font-light text-ink-primary truncate">
            {pageTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {attentionCount > 0 && (
            <Link
              href="/dashboard/planning?tab=recurring"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                overdueCount > 0
                  ? "bg-red-10 text-red-100 hover:bg-red-10"
                  : "bg-surface-elevated border border-line-subtle text-ink-body hover:bg-surface-hover"
              }`}
            >
              <BiBell size={14} />
              <span>
                {overdueCount > 0
                  ? `${overdueCount} overdue`
                  : `${dueSoonCount} due soon`}
              </span>
            </Link>
          )}

          <button
            type="button"
            className="px-5 py-2.5 rounded-full bg-surface-elevated hover:bg-surface-hover border border-line text-ink-secondary text-sm font-normal cursor-pointer transition-colors"
            onClick={() => open(AddTransactionSidebar)}
          >
            Add Transaction
          </button>
        </div>
      </header>

      <RhsSidebar />
    </>
  );
}
