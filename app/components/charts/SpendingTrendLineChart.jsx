"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_FONT, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function SpendingTrendLineChart({
  dailyTrend = [],
  currency = "INR",
  height = 160,
}) {
  const chartData = useMemo(() => {
    const labels = dailyTrend.map((d) => d.label || d.date);
    let cumulative = 0;
    const cumulativeExpense = dailyTrend.map((d) => {
      cumulative += d.expense || 0;
      return cumulative;
    });

    return {
      labels,
      datasets: [
        {
          label: "Cumulative Spend",
          data: cumulativeExpense,
          borderColor: "#e16449", // theme accent
          backgroundColor: "rgba(225, 100, 73, 0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: "#e16449",
        },
      ],
    };
  }, [dailyTrend]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            label: function (context) {
              const val = context.parsed.y || 0;
              return ` Total Spend to Date: ${cFormat(val, { currency })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#71717a",
            font: CHART_FONT,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 7,
          },
        },
        y: {
          display: true,
          position: "right",
          grid: {
            color: "rgba(255, 255, 255, 0.04)",
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#52525b",
            font: {
              ...CHART_FONT,
              size: 10,
            },
            maxTicksLimit: 4,
            callback: function (val) {
              if (val >= 1000) return `${Math.round(val / 1000)}k`;
              return val;
            },
          },
        },
      },
    };
  }, [currency]);

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <Line data={chartData} options={options} />
    </div>
  );
}
