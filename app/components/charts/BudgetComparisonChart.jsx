"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_FONT, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function BudgetComparisonChart({
  categories = [],
  currency = "INR",
  height = 220,
}) {
  const { chartData, hasData } = useMemo(() => {
    // Only show categories that have a budget cap or spending
    const active = categories.filter(
      (c) => (Number(c.budget) || Number(c.monthly_budget) || 0) > 0 || (Number(c.spent) || 0) > 0
    ).slice(0, 8);

    if (active.length === 0) {
      return { chartData: null, hasData: false };
    }

    const labels = active.map((c) => c.name);
    const budgetData = active.map((c) => Number(c.budget || c.monthly_budget || 0));
    const spentData = active.map((c) => Number(c.spent || 0));

    const spentColors = active.map((c) => {
      const cap = Number(c.budget || c.monthly_budget || 0);
      const spent = Number(c.spent || 0);
      if (cap > 0 && spent > cap) return "#ef4444"; // red over cap
      if (cap > 0 && spent / cap >= 0.8) return "#f59e0b"; // amber close to cap
      return "#22c55e"; // green within cap
    });

    return {
      hasData: true,
      chartData: {
        labels,
        datasets: [
          {
            label: "Monthly Cap",
            data: budgetData,
            backgroundColor: "rgba(0, 0, 0, 0.08)",
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.7,
          },
          {
            label: "Actual Spent",
            data: spentData,
            backgroundColor: spentColors,
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.7,
          },
        ],
      },
    };
  }, [categories]);

  const options = useMemo(() => {
    return {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#71717a",
            font: {
              ...CHART_FONT,
              size: 11,
            },
          },
        },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            label: function (context) {
              const datasetLabel = context.dataset.label || "";
              const val = context.parsed.x || 0;
              return ` ${datasetLabel}: ${cFormat(val, { currency })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.04)",
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
            maxTicksLimit: 5,
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
