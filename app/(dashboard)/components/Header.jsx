"use client";

import { BiPlus } from "react-icons/bi";
import AddTransactionSidebar from "./AddTransactionSidebar";
import { usePathname } from "next/navigation";
import { nav, navBottom } from "@/app/utils/navItems";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import RhsSidebar from "@/app/components/RhsSidebar";

export default function Header() {
  const { open } = useRhsSidebarStore();
  const pathname = usePathname();
  const navItems = [...nav, ...navBottom];
  const currentPath = navItems.find((item) => item.url == pathname);

  return (
    <>
      <header className="flex w-full grow  pb-4 items-center justify-between">
        {/* welcome */}
        <div className="text-4xl flex gap-2">
          {pathname == "/dashboard" ? (
            <>
              <span className="text-gray-bc font-light">Hi!</span>
              <span className="text-accent font-inter tracking-tight font-medium">
                Jeison Joe
              </span>
            </>
          ) : (
            <span className="text-accent font-inter tracking-tight font-medium">
              {currentPath.name}
            </span>
          )}
        </div>
        <button
          className="px-4 py-3 rounded-lg bg-accent flex items-center  gap-1 text-white text-base cursor-pointer"
          onClick={() => open(AddTransactionSidebar)}
        >
          <BiPlus size={20} />
          Add Transaction
        </button>
      </header>
      <RhsSidebar />
    </>
  );
}
