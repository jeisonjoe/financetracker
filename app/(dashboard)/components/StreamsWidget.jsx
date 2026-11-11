"use client";

import { useState } from "react";
import Link from "next/link";
import { BiPlus, BiChevronRight } from "react-icons/bi";
import { formatAmountParts } from "@/app/utils/currencyFormat";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";

const DECK_THEME_CLASSES = ["wallet-deck-0", "wallet-deck-1", "wallet-deck-2"];

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
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/wallets"
            className="w-6 h-6 rounded-full border border-line-strong flex items-center justify-center text-ink-muted hover:text-ink-primary hover:border-line-focus transition-colors"
            title="Manage wallets"
          >
            <BiPlus size={14} />
          </Link>
          <span className="text-lg font-normal text-ink-body">Wallets</span>
        </div>

        {count > 1 && (
          <button
            type="button"
            onClick={cycleCard}
            className="flex items-center gap-1 text-xs text-ink-subtle hover:text-ink-secondary cursor-pointer transition-colors"
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
          className="h-52 w-full rounded-2xl bg-surface-elevated border border-line-subtle flex flex-col items-center justify-center gap-2 text-ink-subtle hover:text-ink-body transition-colors"
        >
          <BiPlus size={24} />
          <span className="text-sm">Add your first wallet</span>
        </Link>
      ) : (
        <>
          <div className="relative pt-7">
            {/* Back peeking card */}
            {nextWallet && (
              <button
                type="button"
                onClick={cycleCard}
                aria-label={`Switch to ${nextWallet.name}`}
                className="absolute top-0 left-3 right-3 h-24 rounded-2xl wallet-peek-surface px-5 pt-3 flex items-start justify-between cursor-pointer transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span className="text-xs font-medium tracking-normal truncate">
                  {nextWallet.name}
                </span>
                <span className="text-[11px] font-medium wallet-peek-muted capitalize">
                  {nextWallet.type}
                </span>
              </button>
            )}

            {/* Front active wallet card */}
            <div
              onClick={cycleCard}
              className={`relative z-10 rounded-2xl border border-line p-6 min-h-[195px] flex flex-col justify-between transition-all duration-300 text-ink-primary ${
                count > 1 ? "cursor-pointer" : ""
              } ${DECK_THEME_CLASSES[safeIndex % DECK_THEME_CLASSES.length]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-normal text-ink-secondary truncate">
                  {activeWallet.name}
                </span>
                <span className="text-xs text-ink-muted capitalize">
                  {activeWallet.type}
                </span>
              </div>

              <div className="flex items-end justify-between gap-4 pt-8">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-ink-subtle font-normal">
                    Current Balance
                  </span>
                  <div className="flex items-baseline text-ink-primary tabular-nums">
                    <span className="text-sm font-normal text-ink-muted mr-1">
                      {parts.sign}
                      {parts.symbol}
                    </span>
                    <span className="text-3xl sm:text-4xl font-light">
                      {parts.whole}
                    </span>
                    <span className="text-sm font-light text-ink-subtle ml-0.5">
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

          {count > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {wallets.map((wallet, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <button
                    key={wallet.id || wallet.name}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap cursor-pointer transition-colors ${
                      isActive
                        ? "bg-cta text-cta-ink font-medium"
                        : "bg-surface-elevated border border-line-subtle text-ink-subtle hover:text-ink-primary"
                    }`}
                  >
                    {wallet.name}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
