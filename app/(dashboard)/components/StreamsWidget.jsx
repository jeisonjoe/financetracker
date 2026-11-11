"use client";

import { useState } from "react";
import Link from "next/link";
import { BiPlus, BiChevronRight } from "react-icons/bi";
import { formatAmountParts } from "@/app/utils/currencyFormat";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";

const CARD_THEMES = [
  "bg-gradient-to-br from-[#23202E] via-[#18171F] to-[#111115] text-zinc-100 border-white/[0.08]",
  "bg-gradient-to-br from-[#1C2329] via-[#151A1F] to-[#101215] text-zinc-100 border-white/[0.08]",
  "bg-gradient-to-br from-[#281F21] via-[#1B1618] to-[#121011] text-zinc-100 border-white/[0.08]",
];

export default function StreamsWidget() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data, isLoading } = useAnalytics("this_month");
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const wallets = data?.wallets || [];
  const count = wallets.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const activeWallet = count > 0 ? wallets[safeIndex] : null;
  const nextWallet = count > 1 ? wallets[(safeIndex + 1) % count] : null;

  const cycleCard = () => {
    if (count > 1) {
      setActiveIndex((prev) => (prev + 1) % count);
    }
  };

  const parts = formatAmountParts(activeWallet?.balance ?? 0, currency);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/wallets"
            className="w-6 h-6 rounded-full border border-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-white/30 transition-colors"
            title="Manage wallets"
          >
            <BiPlus size={14} />
          </Link>
          <span className="text-lg font-normal text-zinc-300">Streams</span>
        </div>

        {count > 1 && (
          <button
            type="button"
            onClick={cycleCard}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 cursor-pointer transition-colors"
          >
            <span>
              {safeIndex + 1} / {count}
            </span>
            <BiChevronRight size={15} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-52 w-full rounded-2xl bg-surface-elevated animate-pulse" />
      ) : !activeWallet ? (
        <Link
          href="/dashboard/wallets"
          className="h-52 w-full rounded-2xl bg-surface-elevated border border-white/[0.06] flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <BiPlus size={24} />
          <span className="text-sm">Add your first wallet stream</span>
        </Link>
      ) : (
        <div className="relative pt-7">
          {/* Back peeking platinum card */}
          {nextWallet && (
            <button
              type="button"
              onClick={cycleCard}
              aria-label={`Switch to ${nextWallet.name}`}
              className="absolute top-0 left-3 right-3 h-24 rounded-2xl bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-300 text-zinc-900 px-5 pt-3 flex items-start justify-between cursor-pointer transition-transform duration-300 hover:-translate-y-0.5"
            >
              <span className="text-xs font-medium tracking-normal truncate">
                {nextWallet.name}
              </span>
              <span className="text-[11px] font-medium text-zinc-600 capitalize">
                {nextWallet.type}
              </span>
            </button>
          )}

          {/* Front active dark stream card */}
          <div
            onClick={cycleCard}
            className={`relative z-10 rounded-2xl border p-6 min-h-[195px] flex flex-col justify-between transition-all duration-300 ${
              count > 1 ? "cursor-pointer" : ""
            } ${CARD_THEMES[safeIndex % CARD_THEMES.length]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-normal text-zinc-200 truncate">
                {activeWallet.name}
              </span>
              <span className="text-xs text-zinc-400 capitalize">
                {activeWallet.type}
              </span>
            </div>

            <div className="flex items-end justify-between gap-4 pt-8">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 font-normal">
                  Current Balance
                </span>
                <div className="flex items-baseline text-zinc-100">
                  <span className="text-sm font-normal text-zinc-400 mr-1">
                    {parts.sign}
                    {parts.symbol}
                  </span>
                  <span className="text-3xl sm:text-4xl font-light">
                    {parts.whole}
                  </span>
                  <span className="text-sm font-light text-zinc-500 ml-0.5">
                    .{parts.decimal}
                  </span>
                </div>
              </div>

              {/* Dual-circle card emblem */}
              <div className="flex items-center pb-1 shrink-0" aria-hidden="true">
                <span className="w-5 h-5 rounded-full bg-accent/90 inline-block" />
                <span className="w-5 h-5 rounded-full bg-amber-400/80 -ml-2 inline-block" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

