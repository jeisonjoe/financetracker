"use client";

import { useState } from "react";
import Link from "next/link";
import { BiPlus, BiChevronRight } from "react-icons/bi";
import { formatAmountParts } from "@/app/utils/currencyFormat";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";

const DECK_THEME_CLASSES = [
  "wallet-deck-0",
  "wallet-deck-1",
  "wallet-deck-2",
  "wallet-deck-3",
];

function getCardLast4(wallet) {
  if (!wallet) return "4242";
  const str = String(wallet.id || wallet.name || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 9000;
  }
  return String(1000 + Math.abs(hash));
}

function ContactlessIcon({ className = "w-4 h-4 text-ink-subtle" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8.5 16.5a5 5 0 0 1 0-9" />
      <path d="M12 19a8.5 8.5 0 0 0 0-14" />
      <path d="M15.5 21.5a12 12 0 0 0 0-19" />
    </svg>
  );
}

function EmvChip() {
  return (
    <div
      className="relative w-9 h-7 rounded-[5px] bg-gradient-to-br from-amber-200/25 via-amber-400/20 to-amber-600/30 border border-amber-300/35 overflow-hidden shadow-inner shrink-0"
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-200/30" />
      <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-amber-200/30" />
      <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-amber-200/30" />
      <div className="absolute top-1 bottom-1 left-2.5 right-2.5 rounded-[2px] border border-amber-200/25" />
    </div>
  );
}

function CardNetworkLogo({ type = "card", name = "" }) {
  const isCash = /cash/i.test(name) || /cash/i.test(type);
  const isVisa = /visa/i.test(name);
  const isRupay = /rupay/i.test(name);

  if (isCash) {
    return (
      <span className="text-[10px] font-mono tracking-wider text-ink-muted/80 uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10">
        Cash
      </span>
    );
  }

  if (isVisa) {
    return (
      <span className="text-sm font-semibold italic text-sky-400 tracking-wider">
        VISA
      </span>
    );
  }

  if (isRupay) {
    return (
      <span className="text-xs font-semibold text-orange-400 tracking-wide">
        RuPay<span className="text-[9px] text-green-400 ml-0.5">▶</span>
      </span>
    );
  }

  // Default: Mastercard interlocking dual circles
  return (
    <div className="flex items-center" aria-hidden="true">
      <span className="w-5 h-5 rounded-full bg-[#EB001B] inline-block opacity-90 shadow-sm" />
      <span className="w-5 h-5 rounded-full bg-[#F79E1B] -ml-2 inline-block opacity-90 mix-blend-screen shadow-sm" />
    </div>
  );
}

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
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/wallets"
            className="w-6 h-6 rounded-full border border-line-strong flex items-center justify-center text-ink-muted hover:text-ink-primary hover:border-line-focus transition-colors"
            title="Manage wallets"
          >
            <BiPlus size={14} />
          </Link>
          <span className="text-base font-normal text-ink-body">Wallets</span>
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
        <div className="h-[285px] w-full rounded-2xl bg-surface-elevated animate-pulse" />
      ) : !activeWallet ? (
        <Link
          href="/dashboard/wallets"
          className="h-[285px] w-full rounded-2xl bg-surface-elevated border border-line-subtle flex flex-col items-center justify-center gap-2 text-ink-subtle hover:text-ink-body transition-colors"
        >
          <BiPlus size={24} />
          <span className="text-sm">Add your first wallet</span>
        </Link>
      ) : (
        <div className={`relative ${count > 1 ? "pt-10" : "pt-0"}`}>
          {/* Tertiary subtle card rim for multi-card deck depth */}
          {count >= 3 && (
            <div
              className="absolute top-0 left-6 right-6 h-28 rounded-2xl border border-white/5 bg-surface-elevated/30 opacity-40 pointer-events-none"
              aria-hidden="true"
            />
          )}

          {/* Back peeking card */}
          {nextWallet && (
            <button
              type="button"
              onClick={cycleCard}
              aria-label={`Switch to ${nextWallet.name}`}
              className={`absolute ${
                count >= 3 ? "top-2.5" : "top-0"
              } left-3 right-3 h-28 rounded-2xl border border-white/10 ring-1 ring-inset ring-white/5 px-5 pt-2.5 flex items-start justify-between cursor-pointer transition-all duration-300 hover:-translate-y-0.5 opacity-75 hover:opacity-95 shadow-md ${
                DECK_THEME_CLASSES[(safeIndex + 1) % DECK_THEME_CLASSES.length]
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-ink-secondary truncate max-w-[170px]">
                  {nextWallet.name}
                </span>
              </div>
              <span className="text-[10px] capitalize font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-muted">
                {nextWallet.type || "Card"}
              </span>
            </button>
          )}

          {/* Front active card */}
          <div
            onClick={cycleCard}
            className={`group relative z-10 rounded-2xl border border-white/10 ring-1 ring-inset ring-white/5 p-5 sm:p-6 h-[245px] flex flex-col justify-between transition-all duration-300 text-ink-primary overflow-hidden shadow-lg ${
              count > 1 ? "cursor-pointer hover:border-white/20 hover:scale-[1.008]" : ""
            } ${DECK_THEME_CLASSES[safeIndex % DECK_THEME_CLASSES.length]}`}
          >
            {/* Subtle ambient specular highlight */}
            <div
              className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-gradient-to-br from-white/[0.08] to-transparent blur-2xl"
              aria-hidden="true"
            />

            {/* Top Row: Bank / Wallet Name & Contactless + Card Type Badge */}
            <div className="flex items-center justify-between gap-3 relative z-10">
              <span className="text-sm font-medium text-ink-primary tracking-normal truncate">
                {activeWallet.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <ContactlessIcon className="w-4 h-4 text-ink-muted/70" />
                <span className="text-[10px] capitalize font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-secondary">
                  {activeWallet.type || "Debit"}
                </span>
              </div>
            </div>

            {/* Middle Row: EMV Chip & Masked Card Digits */}
            <div className="flex items-center justify-between gap-4 pt-3 pb-1 relative z-10">
              <EmvChip />
              <span className="font-mono text-xs text-ink-muted/80 tabular-nums select-none">
                •••• {getCardLast4(activeWallet)}
              </span>
            </div>

            {/* Bottom Row: Balance & Network Logo */}
            <div className="flex items-end justify-between gap-4 pt-2 relative z-10">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-ink-subtle font-normal tracking-normal">
                  Current Balance
                </span>
                <div className="flex items-baseline text-ink-primary tabular-nums">
                  <span className="text-sm font-normal text-ink-muted mr-1">
                    {parts.sign}
                    {parts.symbol}
                  </span>
                  <span className="text-3xl sm:text-4xl font-light tracking-tight">
                    {parts.whole}
                  </span>
                  <span className="text-sm font-light text-ink-subtle ml-0.5">
                    .{parts.decimal}
                  </span>
                </div>
              </div>

              <div className="pb-1 shrink-0">
                <CardNetworkLogo
                  type={activeWallet.type}
                  name={activeWallet.name}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
