"use client";

import { BiMenu } from "react-icons/bi";
import AddTransactionSidebar from "./AddTransactionSidebar";
import { usePathname } from "next/navigation";
import { nav, navBottom } from "@/app/utils/navItems";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import RhsSidebar from "@/app/components/RhsSidebar";

export default function Header({ onOpenMobileNav }) {
  const { open } = useRhsSidebarStore();
  const pathname = usePathname();
  const navItems = [...nav, ...navBottom];
  const currentPath = navItems.find((item) => item.url === pathname);
  const isOverview = pathname === "/dashboard";

  return (
    <>
      {!isOverview && (
        <header className="flex w-full pb-6 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onOpenMobileNav && (
              <button
                type="button"
                onClick={onOpenMobileNav}
                className="lg:hidden p-2 rounded-xl bg-surface-elevated text-zinc-300 cursor-pointer"
                aria-label="Open navigation"
              >
                <BiMenu size={20} />
              </button>
            )}
            <h2 className="text-2xl sm:text-3xl font-light text-zinc-100 truncate">
              {currentPath?.name || "Dashboard"}
            </h2>
          </div>

          <button
            type="button"
            className="px-5 py-2.5 rounded-full bg-surface-elevated hover:bg-surface-hover border border-white/[0.07] text-zinc-200 text-sm font-normal cursor-pointer transition-colors shrink-0"
            onClick={() => open(AddTransactionSidebar)}
          >
            Add Transaction
          </button>
        </header>
      )}

      {isOverview && onOpenMobileNav && (
        <div className="flex lg:hidden items-center justify-between pb-4">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="p-2 rounded-xl bg-surface-elevated text-zinc-300 cursor-pointer"
            aria-label="Open navigation"
          >
            <BiMenu size={20} />
          </button>
          <span className="text-sm text-zinc-400">Expense Tracker</span>
          <div className="w-9" />
        </div>
      )}

      <RhsSidebar />
    </>
  );
}
