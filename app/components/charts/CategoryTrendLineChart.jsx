"use client";

import { useEffect, useMemo, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function CategoryTrendLineChart({
  transactions = [],
  currency = "INR",
  height = 140,
  categoryName = "",
  budget = 0,
}) {
  const chartRef = useRef(null);

  // Group transactions by date and compute cumulative spending timeline
  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];

    // Filter only expense transactions
    const expenses = transactions.filter((t) => t.type === "expense");
    if (expenses.length === 0) return [];

    // Map by date (YYYY-MM-DD)
    const map = new Map();
    for (const t of expenses) {
      const rawDate = t.created_at || t.date || t.iso_date;
      if (!rawDate) continue;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) continue;
      const dateKey = d.toISOString().split("T")[0];
      const prev = map.get(dateKey) || { total: 0, date: d, count: 0 };
      map.set(dateKey, {
        total: prev.total + (Number(t.amount) || 0),
        date: d,
        count: prev.count + 1,
      });
    }

    // Sort chronologically
    const sorted = Array.from(map.entries())
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

    let cumulative = 0;
    return sorted.map(([dateKey, val]) => {
      cumulative += val.total;
      return {
        dateStr: dateKey,
        label: val.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dailySpend: val.total,
        cumulativeSpend: cumulative,
        count: val.count,
      };
    });
  }, [transactions]);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    const root = createAmChartsRoot(chartRef.current);
    if (!root) return;

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 0,
        paddingRight: 10,
        paddingTop: 8,
        paddingBottom: 0,
      })
    );

    // Category X Axis
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 32,
    });
    xRenderer.grid.template.set("visible", false);
    xRenderer.labels.template.setAll({
      fill: AM_COLORS.inkSubtle,
      fontSize: 10,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "label",
        renderer: xRenderer,
      })
    );
    xAxis.data.setAll(chartData);

    // Value Y Axis
    const yRenderer = am5xy.AxisRendererY.new(root, {
      opposite: true,
    });
    yRenderer.grid.template.setAll({
      stroke: AM_COLORS.grid,
      strokeOpacity: 0.04,
    });
    yRenderer.labels.template.setAll({
      fill: AM_COLORS.inkSubtle,
      fontSize: 10,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: yRenderer,
        numberFormat: "#a",
      })
    );

    // Optional Budget Cap line
    if (budget > 0) {
      const rangeDataItem = yAxis.makeDataItem({
        value: Number(budget),
      });
      const range = yAxis.createAxisRange(rangeDataItem);
      range.get("grid").setAll({
        stroke: AM_COLORS.green,
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
        strokeOpacity: 0.7,
        visible: true,
      });
    }

    // Smoothed Line Series for Cumulative Spend
    const series = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: `${categoryName || "Category"} Cumulative Spend`,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "cumulativeSpend",
        categoryXField: "label",
        stroke: AM_COLORS.accent,
        fill: AM_COLORS.accent,
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.strokes.template.setAll({
      strokeWidth: 2,
    });

    // Soft gradient fill
    series.fills.template.setAll({
      fillOpacity: 0.1,
      visible: true,
    });

    // Bullets on data points
    series.bullets.push(() => {
      const circle = am5.Circle.new(root, {
        radius: 3,
        fill: AM_COLORS.accent,
        stroke: AM_COLORS.surfaceElevated,
        strokeWidth: 1.5,
      });

      return am5.Bullet.new(root, {
        sprite: circle,
      });
    });

    // Rich Tooltip format
    series.get("tooltip").label.set(
      "text",
      "{categoryX}: [medium]{valueY.formatNumber('#,###')}[/] " + currency + "\n[#7c7c88 text-xs]Daily: {dailySpend.formatNumber('#,###')} (" + currency + ")[/]"
    );

    series.data.setAll(chartData);
    series.appear(500);

    // Cursor
    const cursor = chart.set(
      "cursor",
      am5xy.XYCursor.new(root, {
        behavior: "none",
        xAxis: xAxis,
      })
    );
    cursor.lineY.set("visible", false);
    cursor.lineX.setAll({
      stroke: AM_COLORS.inkSubtle,
      strokeDasharray: [3, 3],
      strokeOpacity: 0.3,
    });

    chart.appear(600, 100);

    return () => {
      root.dispose();
    };
  }, [chartData, budget, currency, categoryName]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface border border-line-faint">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-secondary">Spending Trend over Period</span>
        <span className="text-[11px] text-ink-subtle">
          {chartData.length} active {chartData.length === 1 ? "day" : "days"}
        </span>
      </div>
      <div style={{ height: `${height}px` }} className="w-full relative">
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
