"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_FONT, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function DebtsBarChart({
  contacts = [],
  currency = "INR",
  height = 180,
}) {
  const { chartData, hasData } = useMemo(() => {
    // Only chart contacts with non-zero balances
    const active = contacts
      .filter((c) => Math.abs(Number(c.balance) || 0) > 0)
      .slice(0, 8);

    if (active.length === 0) {
      return { chartData: null, hasData: false };
    }

    const labels = active.map((c) => c.name);
    const data = active.map((c) => Number(c.balance) || 0);
    const bgColors = active.map((c) =>
      (Number(c.balance) || 0) > 0 ? "rgba(34, 197, 94, 0.85)" : "rgba(239, 68, 68, 0.85)"
    );

    return {
      hasData: true,
      chartData: {
        labels,
        datasets: [
          {
            label: "Net Balance",
            data,
            backgroundColor: bgColors,
            borderRadius: 4,
            barPercentage: 0.6,
          },
        ],
      },
    };
  }, [contacts]);

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
              const status = val > 0 ? "Owes you" : "You owe";
              return ` ${status}: ${cFormat(Math.abs(val), { currency })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#71717a",
            font: {
              ...CHART_FONT,
              size: 10,
            },
            callback: function (val) {
              if (Math.abs(val) >= 1000) return `${Math.round(val / 1000)}k`;
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
            color: "#27272a",
            font: {
              ...CHART_FONT,
              size: 11,
              weight: 500,
            },
          },
        },
      },
    };
  }, [currency]);

  if (!hasData) {
    return null;
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <Bar data={chartData} options={options} />
    </div>
  );
}
