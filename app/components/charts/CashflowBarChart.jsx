"use client";

import { useEffect, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function CashflowBarChart({
  dailyTrend = [],
  currency = "INR",
  height = 140,
}) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !dailyTrend || dailyTrend.length === 0) return;

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

    const data = dailyTrend.map((d) => ({
      label: d.label || d.date,
      income: d.income || 0,
      expense: d.expense || 0,
    }));

    // Category X Axis
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 32,
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
        categoryField: "label",
        renderer: xRenderer,
      })
    );
    xAxis.data.setAll(data);

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

    // Income Column Series (Green)
    const incomeSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Income",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "income",
        categoryXField: "label",
        fill: AM_COLORS.green,
        stroke: AM_COLORS.green,
        clustered: true,
        tooltip: createAmTooltip(root, currency),
      })
    );

    incomeSeries.columns.template.setAll({
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      width: am5.percent(70),
      fillOpacity: 0.85,
      strokeOpacity: 0,
    });

    incomeSeries.columns.template.states.create("hover", {
      fillOpacity: 1,
    });

    incomeSeries.get("tooltip").label.set(
      "text",
      "[#a1a1aa]{categoryX} Income:[/] [#4ade80 font-medium]{valueY.formatNumber('#,###')} " + currency + "[/]"
    );

    // Expense Column Series (Coral/Accent)
    const expenseSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Expense",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "expense",
        categoryXField: "label",
        fill: AM_COLORS.accent,
        stroke: AM_COLORS.accent,
        clustered: true,
        tooltip: createAmTooltip(root, currency),
      })
    );

    expenseSeries.columns.template.setAll({
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      width: am5.percent(70),
      fillOpacity: 0.85,
      strokeOpacity: 0,
    });

    expenseSeries.columns.template.states.create("hover", {
      fillOpacity: 1,
    });

    expenseSeries.get("tooltip").label.set(
      "text",
      "[#a1a1aa]{categoryX} Expense:[/] [#e16449 font-medium]{valueY.formatNumber('#,###')} " + currency + "[/]"
    );

    incomeSeries.data.setAll(data);
    expenseSeries.data.setAll(data);

    incomeSeries.appear(500);
    expenseSeries.appear(500);

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
  }, [dailyTrend, currency]);

  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No cashflow data available</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
}
