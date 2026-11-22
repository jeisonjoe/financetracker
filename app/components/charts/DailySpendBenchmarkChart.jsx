"use client";

import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import "./ChartConfig";
import { COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function DailySpendBenchmarkChart({
  dailyTrend = [],
  dailyAllowance = 0,
  avgDailySpend = 0,
  currency = "INR",
  height = 200,
}) {
  const chartData = useMemo(() => {
    const labels = dailyTrend.map((d) => d.label || d.date);
    const expenseData = dailyTrend.map((d) => d.expense || 0);

    // Limit line dataset across all points
    const limitData = Array(dailyTrend.length).fill(dailyAllowance || 0);

    const backgroundColors = expenseData.map((val) =>
      dailyAllowance > 0 && val > dailyAllowance
        ? "rgba(225, 100, 73, 0.85)" // Over daily budget limit
        : "rgba(14, 165, 233, 0.7)" // Within budget limit
    );

    return {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Daily Spend",
          data: expenseData,
          backgroundColor: backgroundColors,
          borderRadius: 4,
          maxBarThickness: 28,
        },
        ...(dailyAllowance > 0
          ? [
              {
                type: "line",
                label: "Safe Daily Limit",
                data: limitData,
                borderColor: "rgba(16, 185, 129, 0.9)",
                borderWidth: 2,
                borderDash: [5, 4],
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
              },
            ]
          : []),
      ],
    };
  }, [dailyTrend, dailyAllowance]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#71717a",
            font: { family: "var(--font-inter, sans-serif)", size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
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
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            color: "#52525b",
            font: { family: "var(--font-inter, sans-serif)", size: 11 },
          },
        },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            label: function (context) {
              const val = context.parsed.y || 0;
              const dsLabel = context.dataset.label;
              if (dsLabel === "Safe Daily Limit") {
                return ` Safe Limit: ${cFormat(val, { currency })}`;
              }
              const diff = dailyAllowance > 0 ? val - dailyAllowance : 0;
              const status =
                dailyAllowance > 0
                  ? diff > 0
                    ? ` (+${cFormat(diff, { currency })} over limit)`
                    : ` (${cFormat(Math.abs(diff), { currency })} under limit)`
                  : "";
              return ` Spent: ${cFormat(val, { currency })}${status}`;
            },
          },
        },
      },
    };
  }, [currency, dailyAllowance]);

  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No daily spending data to plot</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          {dailyAllowance > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Safe Limit:</span>
              <span className="font-medium tabular-nums">{cFormat(dailyAllowance, { currency })}/day</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-surface-elevated/70 border border-line-subtle px-2.5 py-1 rounded-lg text-ink-secondary">
            <span>Avg Spend:</span>
            <span className="font-medium text-ink-primary tabular-nums">
              {cFormat(avgDailySpend, { currency })}/day
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="w-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </div>
  );
}
