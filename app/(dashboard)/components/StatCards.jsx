"use client";

import { IoWalletOutline } from "react-icons/io5";
import { BiCoinStack } from "react-icons/bi";
import { MdOutlineTrendingDown } from "react-icons/md";
import { GoArrowUp, GoArrowDown } from "react-icons/go";
import { formatAmountParts } from "@/app/utils/currencyFormat";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";

export default function StatCards({ period = "this_month" }) {
  const { data, isLoading } = useAnalytics(period);
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const summary = data?.summary || {
    balance: 0,
    income: 0,
    expense: 0,
    deltas: { balance: 0, income: 0, expense: 0 },
  };

  const today = new Date();
  const day = today.getDate();
  const monthYear = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const weekday = today.toLocaleDateString("en-US", { weekday: "long" });

  const statCards = [
    {
      name: "Balance (Net)",
      icon: IoWalletOutline,
      amount: summary.balance,
      delta: summary.deltas.balance,
      tagText: `${Math.abs(summary.deltas.balance)}% vs last month`,
      positive: summary.deltas.balance >= 0,
    },
    {
      name: "Earnings",
      icon: BiCoinStack,
      amount: summary.income,
      delta: summary.deltas.income,
      tagText: `${Math.abs(summary.deltas.income)}% vs last month`,
      positive: summary.deltas.income >= 0,
    },
    {
      name: "Spendings",
      icon: MdOutlineTrendingDown,
      amount: summary.expense,
      delta: summary.deltas.expense,
      tagText: `${Math.abs(summary.deltas.expense)}% vs last month`,
      positive: summary.deltas.expense <= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {statCards.map((card) => {
        const parts = formatAmountParts(card.amount, currency);

        return (
          <div
            key={card.name}
            className="flex flex-col justify-between gap-3 bg-surface-elevated/50 p-5 rounded-xl border border-white/[0.06]"
          >
            <div className="flex items-center text-zinc-500 gap-2 text-sm font-medium">
              <card.icon size={18} />
              <span>{card.name}</span>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-baseline text-zinc-100">
                <span className="text-2xl font-medium mr-0.5 text-zinc-300">
                  {parts.sign}
                  {parts.symbol}
                </span>
                <span className="text-3xl font-semibold">
                  {isLoading ? "..." : parts.whole}
                </span>
                <span className="text-base font-normal text-zinc-500">
                  .{parts.decimal}
                </span>
              </div>

              <div
                className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium ${
                  card.positive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {card.positive ? <GoArrowUp size={12} /> : <GoArrowDown size={12} />}
                <span>{card.tagText}</span>
              </div>
            </div>

            <div className="text-xs text-zinc-500">This Month</div>
          </div>
        );
      })}

      <div className="flex items-center gap-5 bg-surface-elevated/50 p-5 rounded-xl border border-white/[0.06]">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-950 text-2xl font-semibold flex items-center justify-center shrink-0">
          {day}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-lg font-semibold text-zinc-100 truncate">
            {monthYear}
          </span>
          <span className="text-sm text-zinc-500 font-medium">{weekday}</span>
        </div>
      </div>
    </div>
  );
}
