"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_PALETTE, CHART_FONT, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function WalletDistributionChart({
  wallets = [],
  currency = "INR",
  height = 180,
  cutout = "72%",
}) {
  const { chartData, totalBalance, positiveWallets } = useMemo(() => {
    // Only chart positive liquid balances
    const positive = wallets.filter((w) => (Number(w.balance) || 0) > 0);
    const total = positive.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

    const labels = positive.map((w) => w.name);
    const data = positive.map((w) => Number(w.balance) || 0);

    return {
      totalBalance: total,
      positiveWallets: positive,
      chartData: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: CHART_PALETTE.slice(0, labels.length),
            borderColor: "transparent",
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
    };
  }, [wallets]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            title: () => "",
            label: function (context) {
              const label = context.label || "";
              const val = context.parsed || 0;
              const pct = totalBalance > 0 ? Math.round((val / totalBalance) * 100) : 0;
              return ` ${label}: ${cFormat(val, { currency })} (${pct}%)`;
            },
          },
        },
      },
    };
  }, [cutout, totalBalance, currency]);

  if (positiveWallets.length === 0 || totalBalance === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div style={{ height: `${height}px`, width: `${height}px` }} className="relative shrink-0 flex items-center justify-center">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] text-ink-subtle">Liquid Assets</span>
          <span className="text-xs font-semibold text-ink-primary tabular-nums">
            {cFormat(totalBalance, { currency })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 grow justify-center sm:justify-start">
        {positiveWallets.map((w, i) => {
          const bal = Number(w.balance) || 0;
          const pct = totalBalance > 0 ? Math.round((bal / totalBalance) * 100) : 0;
          const color = CHART_PALETTE[i % CHART_PALETTE.length];
          return (
            <div key={w.id || w.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-ink-secondary truncate max-w-[120px]">{w.name}</span>
              <span className="text-ink-subtle tabular-nums">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
