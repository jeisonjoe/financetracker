"use client";

import Link from "next/link";
import { RiMenu2Line } from "react-icons/ri";
import { usePathname, useRouter } from "next/navigation";
import { nav, navBottom } from "@/app/utils/navItems";
import { useAuth } from "@/app/contexts/AuthContext";
import { BiLogOut, BiX } from "react-icons/bi";
import { useState } from "react";
import ActionModal from "@/app/components/ActionModal";

const ROUTE_HEADLINES = {
  "/dashboard": "Let’s look at today’s expenses.",
  "/dashboard/transactions": "Every transaction, clearly organized.",
  "/dashboard/wallets": "Manage your accounts and streams.",
  "/dashboard/categories": "See where your money goes.",
  "/dashboard/budgets": "Keep pace with your monthly limits.",
  "/dashboard/planning": "Organize, plan, and grow your funds.",
  "/dashboard/preferences": "Personalize your workspace.",
  "/help": "Guides and quick tips.",
  "/import": "Bring in your transaction history.",
};

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const [showLogout, setShowLogout] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const displayName = user?.fullName || "there";
  const headline =
    ROUTE_HEADLINES[pathname] || "Let’s look at today’s expenses.";

  const handleLogout = async () => {
    await logout();
    setShowLogout(false);
    router.push("/");
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-col gap-10">
        {/* Top brand bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RiMenu2Line size={17} />
            <span className="text-sm font-normal">Expense Tracker</span>
          </Link>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 cursor-pointer"
              aria-label="Close navigation"
            >
              <BiX size={20} />
            </button>
          )}
        </div>

        {/* Editorial Greeting */}
        <div className="flex flex-col gap-2.5 pr-2">
          <span className="text-xs text-zinc-500 font-normal">
            Hi, {displayName}
          </span>
          <h1 className="text-2xl font-light text-zinc-400 leading-snug">
            {headline}
          </h1>
        </div>

        {/* Primary Nav */}
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.url;
            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={onCloseMobile}
                className={`px-3.5 py-2 rounded-xl text-sm transition-colors duration-200 ${
                  active
                    ? "bg-nav-active text-zinc-100 font-medium"
                    : "text-zinc-500 hover:bg-nav-hover hover:text-zinc-200"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utility Nav */}
      <nav className="flex flex-col gap-1 pt-6">
        {navBottom.map((item) => {
          const active = pathname === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={onCloseMobile}
              className={`px-3 py-2 rounded-xl text-sm flex gap-3 items-center transition-colors duration-200 ${
                active
                  ? "bg-nav-active text-zinc-100 font-medium"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-nav-hover"
              }`}
            >
              <item.icon size={16} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className="px-3 py-2 rounded-xl text-sm flex gap-3 items-center text-zinc-500 hover:text-red-100 hover:bg-nav-hover cursor-pointer transition-colors duration-200 text-left"
          onClick={() => setShowLogout(true)}
        >
          <BiLogOut size={16} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[260px] xl:w-[290px] shrink-0 bg-app-bg h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        >
          <aside
            className="w-72 max-w-[85vw] bg-app-bg h-full border-r border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}

      <ActionModal
        content="Are you sure you want to log out?"
        secAction={() => setShowLogout(false)}
        primaryAction={handleLogout}
        primaryBtnText="Logout"
        secBtnText="Cancel"
        isOpen={showLogout}
      />
    </>
  );
}
