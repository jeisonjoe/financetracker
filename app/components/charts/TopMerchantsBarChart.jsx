"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_FONT, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function TopMerchantsBarChart({
  merchants = [],
  currency = "INR",
  height = 180,
}) {
  const chartData = useMemo(() => {
    const top = merchants.slice(0, 5);
    const labels = top.map((m) => m.name);
    const data = top.map((m) => m.totalSpent || 0);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: "rgba(225, 100, 73, 0.7)", // theme accent soft
          hoverBackgroundColor: "#e16449",
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.65,
        },
      ],
    };
  }, [merchants]);

  const options = useMemo(() => {
    return {
      indexAxis: "y",
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
              const val = context.parsed.x || 0;
              return ` Total: ${cFormat(val, { currency })}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
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
        y: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#d4d4d8",
            font: CHART_FONT,
            callback: function (val, index) {
              const name = this.getLabelForValue(index) || "";
              return name.length > 14 ? `${name.substring(0, 14)}…` : name;
            },
          },
        },
      },
    };
  }, [currency]);

  if (!merchants || merchants.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No merchant data</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <Bar data={chartData} options={options} />
    </div>
  );
}
