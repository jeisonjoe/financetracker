"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import "./ChartConfig";
import { CHART_FONT, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function CashflowBarChart({
  dailyTrend = [],
  currency = "INR",
  height = 140,
  onHoverDay = null,
}) {
  const chartData = useMemo(() => {
    const labels = dailyTrend.map((d) => d.label || d.date);
    const incomeData = dailyTrend.map((d) => d.income || 0);
    const expenseData = dailyTrend.map((d) => d.expense || 0);

    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "rgba(74, 222, 128, 0.85)", // green
          hoverBackgroundColor: "#4ade80",
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.6,
        },
        {
          label: "Expense",
          data: expenseData,
          backgroundColor: "rgba(225, 100, 73, 0.85)", // accent red/orange
          hoverBackgroundColor: "#e16449",
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.6,
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
          display: false, // We render a clean custom legend in the widget header
        },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            label: function (context) {
              const datasetLabel = context.dataset.label || "";
              const val = context.parsed.y || 0;
              return ` ${datasetLabel}: ${cFormat(val, { currency })}`;
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
            color: "#71717a", // ink-subtle
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
            color: "rgba(0, 0, 0, 0.05)",
          },
          border: {
            display: false,
          },
          ticks: {
            color: "#52525b", // ink-faint
            font: {
              ...CHART_FONT,
              size: 10,
            },
            maxTicksLimit: 4,
            callback: function (val) {
              if (val >= 100000) return `${Math.round(val / 1000)}k`;
              if (val >= 1000) return `${Math.round(val / 1000)}k`;
              return val;
            },
          },
        },
      },
      onHover: (event, chartElement) => {
        if (!onHoverDay) return;
        if (chartElement.length > 0) {
          const index = chartElement[0].index;
          onHoverDay(dailyTrend[index]);
        } else {
          onHoverDay(null);
        }
      },
    };
  }, [dailyTrend, currency, onHoverDay]);

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <Bar data={chartData} options={options} />
    </div>
  );
}
