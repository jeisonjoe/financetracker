"use client";

import { useEffect, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function SpendingTrendLineChart({
  dailyTrend = [],
  currency = "INR",
  height = 160,
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
      })
    );

    // Compute cumulative data
    let cumulative = 0;
    const data = dailyTrend.map((d) => {
      cumulative += d.expense || 0;
      return {
        label: d.label || d.date,
        cumulativeExpense: cumulative,
        dailyExpense: d.expense || 0,
      };
    });

    // Create Category X Axis
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
    xAxis.data.setAll(data);

    // Create Value Y Axis (Right positioned)
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

    // Create Smoothed Line Series
    const series = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: "Cumulative Spend",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "cumulativeExpense",
        categoryXField: "label",
        stroke: AM_COLORS.accent,
        fill: AM_COLORS.accent,
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.strokes.template.setAll({
      strokeWidth: 2,
    });

    // Soft gradient area fill below curve
    series.fills.template.setAll({
      fillOpacity: 0.08,
      visible: true,
    });

    // Bullets on hover
    series.bullets.push(() => {
      const circle = am5.Circle.new(root, {
        radius: 3.5,
        fill: AM_COLORS.accent,
        stroke: AM_COLORS.surfaceElevated,
        strokeWidth: 1.5,
      });

      return am5.Bullet.new(root, {
        sprite: circle,
      });
    });

    // Tooltip format
    series.get("tooltip").label.set(
      "text",
      "{categoryX}: [medium]{valueY.formatNumber('#,###')}[/] " + currency + " (Total to date)"
    );

    series.data.setAll(data);
    series.appear(500);

    // Crosshair cursor
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
      strokeOpacity: 0.4,
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
        <span>No spending data available</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
}
