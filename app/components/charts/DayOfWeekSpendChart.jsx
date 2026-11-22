"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "./ChartConfig";
import { COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function DayOfWeekSpendChart({
  dayOfWeekProfile = null,
  currency = "INR",
  height = 200,
}) {
  const days = dayOfWeekProfile?.days || [];

  const chartData = useMemo(() => {
    const labels = days.map((d) => d.day);
    const data = days.map((d) => d.totalSpent || 0);

    // Differentiate weekends (Sat, Sun) with amber/coral, weekdays with soft indigo/sky
    const colors = days.map((d) =>
      d.day === "Sat" || d.day === "Sun"
        ? "rgba(251, 146, 60, 0.85)" // Weekend
        : "rgba(99, 102, 241, 0.75)" // Weekday
    );

    return {
      labels,
      datasets: [
        {
          label: "Total Spent",
          data,
          backgroundColor: colors,
          borderRadius: 4,
          maxBarThickness: 32,
        },
      ],
    };
  }, [days]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#71717a",
            font: { family: "var(--font-inter, sans-serif)", size: 11 },
          },
        },
        y: {
          grid: { color: "rgba(0, 0, 0, 0.05)" },
          ticks: {
            color: "#71717a",
            font: { family: "var(--font-inter, sans-serif)", size: 10 },
            callback: (val) => cFormat(val, { currency }),
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            label: function (context) {
              const val = context.parsed.y || 0;
              const index = context.dataIndex;
              const entry = days[index];
              const countStr = entry?.count ? ` (${entry.count} txns, avg ${cFormat(entry.avgSpent, { currency })})` : "";
              return ` Total: ${cFormat(val, { currency })}${countStr}`;
            },
          },
        },
      },
    };
  }, [days, currency]);

  if (!dayOfWeekProfile || days.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No weekday spending data available</span>
      </div>
    );
  }

  const { weekdayAvg = 0, weekendAvg = 0, weekendPercent = 0 } = dayOfWeekProfile;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Weekday vs Weekend Profile Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span>Weekday Avg:</span>
            <span className="font-medium tabular-nums">{cFormat(weekdayAvg, { currency })}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Weekend Avg:</span>
            <span className="font-medium tabular-nums">{cFormat(weekendAvg, { currency })}</span>
          </span>
        </div>
        <div className="text-ink-subtle">
          <span>Weekend Share: </span>
          <span className="font-medium text-ink-primary tabular-nums">{weekendPercent}%</span>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="w-full">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
