"use client";

import { useEffect, useMemo, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function BudgetComparisonChart({
  categories = [],
  currency = "INR",
  height = 220,
}) {
  const chartRef = useRef(null);

  const { activeCategories, hasData } = useMemo(() => {
    const active = categories
      .filter(
        (c) =>
          (Number(c.budget) || Number(c.monthly_budget) || 0) > 0 ||
          (Number(c.spent) || 0) > 0
      )
      .slice(0, 8);

    if (active.length === 0) {
      return { activeCategories: [], hasData: false };
    }

    const data = active.map((c) => {
      const budget = Number(c.budget || c.monthly_budget || 0);
      const spent = Number(c.spent || 0);

      let spentColor = am5.color("#4ade80"); // green
      if (budget > 0 && spent > budget) {
        spentColor = am5.color("#f87171"); // red
      } else if (budget > 0 && spent / budget >= 0.8) {
        spentColor = am5.color("#fb923c"); // orange/amber
      }

      return {
        category: c.name,
        budget,
        spent,
        spentSettings: {
          fill: spentColor,
        },
      };
    });

    return { activeCategories: data, hasData: true };
  }, [categories]);

  useEffect(() => {
    if (!chartRef.current || !hasData || activeCategories.length === 0) return;

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
        layout: root.verticalLayout,
      })
    );

    // Category X Axis
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 30,
      cellStartLocation: 0.15,
      cellEndLocation: 0.85,
    });
    xRenderer.grid.template.set("visible", false);
    xRenderer.labels.template.setAll({
      fill: AM_COLORS.inkSubtle,
      fontSize: 10,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "category",
        renderer: xRenderer,
      })
    );
    xAxis.data.setAll(activeCategories);

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

    // Budget Cap Column Series (subtle outline/fill)
    const budgetSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Budget Cap",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "budget",
        categoryXField: "category",
        fill: am5.color("rgba(255, 255, 255, 0.08)"),
        stroke: am5.color("rgba(255, 255, 255, 0.15)"),
        clustered: true,
        tooltip: createAmTooltip(root, currency),
      })
    );

    budgetSeries.columns.template.setAll({
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      width: am5.percent(70),
      strokeWidth: 1,
    });

    budgetSeries.get("tooltip").label.set(
      "text",
      "[#a1a1aa]{categoryX} Budget:[/] [#e6e6ea]{valueY.formatNumber('#,###')} " + currency + "[/]"
    );

    // Actual Spent Column Series
    const spentSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Actual Spent",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "spent",
        categoryXField: "category",
        clustered: true,
        tooltip: createAmTooltip(root, currency),
      })
    );

    spentSeries.columns.template.setAll({
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      width: am5.percent(70),
      templateField: "spentSettings",
      strokeOpacity: 0,
      fillOpacity: 0.9,
    });

    spentSeries.get("tooltip").label.set(
      "text",
      "[#a1a1aa]{categoryX} Spent:[/] [#e6e6ea]{valueY.formatNumber('#,###')} " + currency + "[/]"
    );

    budgetSeries.data.setAll(activeCategories);
    spentSeries.data.setAll(activeCategories);

    budgetSeries.appear(500);
    spentSeries.appear(500);

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
  }, [activeCategories, hasData, currency]);

  if (!hasData) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No category budgets or spend to compare</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-ink-subtle px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-white/10 border border-white/20 shrink-0" />
          <span>Budget Cap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shrink-0" />
          <span>Within Budget</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
          <span>Near Cap (80%+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0" />
          <span>Overspent</span>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="w-full relative">
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
