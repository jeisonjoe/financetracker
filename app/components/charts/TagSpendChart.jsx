"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_PALETTE, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function TagSpendChart({
  tagBreakdown = [],
  currency = "INR",
  height = 180,
}) {
  const chartData = useMemo(() => {
    const top = tagBreakdown.slice(0, 6);
    const labels = top.map((t) => t.tag);
    const data = top.map((t) => t.spent || 0);

    return {
      labels,
      datasets: [
        {
          axis: "y",
          label: "Spent",
          data,
          backgroundColor: CHART_PALETTE.slice(0, labels.length),
          borderRadius: 4,
          maxBarThickness: 18,
        },
      ],
    };
  }, [tagBreakdown]);

  const options = useMemo(() => {
    return {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: "rgba(0, 0, 0, 0.05)" },
          ticks: {
            color: "#71717a",
            font: { family: "var(--font-inter, sans-serif)", size: 10 },
            callback: (val) => cFormat(val, { currency }),
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "#52525b",
            font: { family: "var(--font-inter, sans-serif)", size: 11, weight: 500 },
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            label: function (context) {
              const val = context.parsed.x || 0;
              const idx = context.dataIndex;
              const item = tagBreakdown[idx];
              const countStr = item?.count ? ` (${item.count} txns)` : "";
              return ` ${cFormat(val, { currency })}${countStr}`;
            },
          },
        },
      },
    };
  }, [tagBreakdown, currency]);

  if (!tagBreakdown || tagBreakdown.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No tagged transactions in this period</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
