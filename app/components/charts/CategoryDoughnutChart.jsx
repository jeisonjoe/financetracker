"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_PALETTE, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function CategoryDoughnutChart({
  categories = [],
  currency = "INR",
  height = 180,
  cutout = "72%",
  showCenterText = true,
}) {
  const { chartData, totalSpent } = useMemo(() => {
    const valid = categories.filter((c) => (c.spent || 0) > 0);
    const top = valid.slice(0, 8);
    const other = valid.slice(8);

    const labels = top.map((c) => c.name);
    const data = top.map((c) => c.spent || 0);

    if (other.length > 0) {
      const otherSpent = other.reduce((sum, c) => sum + (c.spent || 0), 0);
      labels.push("Other Categories");
      data.push(otherSpent);
    }

    const total = data.reduce((sum, v) => sum + v, 0);

    return {
      totalSpent: total,
      chartData: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: CHART_PALETTE.slice(0, labels.length),
            borderColor: "#ffffff", // clean light mode slice separator
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
    };
  }, [categories]);

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
            label: function (context) {
              const label = context.label || "";
              const val = context.parsed || 0;
              const pct = totalSpent > 0 ? Math.round((val / totalSpent) * 100) : 0;
              return ` ${label}: ${cFormat(val, { currency })} (${pct}%)`;
            },
          },
        },
      },
    };
  }, [cutout, totalSpent, currency]);

  if (!categories || categories.length === 0 || totalSpent === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex flex-col items-center justify-center text-xs text-ink-subtle"
      >
        <span>No spending data to visualize</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full relative flex items-center justify-center">
      <Doughnut data={chartData} options={options} />

      {showCenterText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[11px] text-ink-subtle">Total Spent</span>
          <span className="text-sm sm:text-base font-medium text-ink-primary tabular-nums">
            {cFormat(totalSpent, { currency })}
          </span>
        </div>
      )}
    </div>
  );
}
