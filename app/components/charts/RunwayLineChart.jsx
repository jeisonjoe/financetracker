"use client";

import { useEffect, useMemo, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function RunwayLineChart({
  dailyTrend = [],
  dailyAllowance = 0,
  currency = "INR",
  height = 180,
}) {
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (!dailyTrend || dailyTrend.length === 0) return [];

    let cumulative = 0;
    return dailyTrend.map((d, idx) => {
      cumulative += d.expense || 0;
      const linearAllowance = dailyAllowance > 0 ? Math.round(dailyAllowance * (idx + 1)) : 0;

      return {
        label: d.label || d.date,
        actualSpend: cumulative,
        safeTrajectory: linearAllowance,
      };
    });
  }, [dailyTrend, dailyAllowance]);

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

    // Safe Linear Trajectory Guide Line (Dashed Green)
    if (dailyAllowance > 0) {
      const trajectorySeries = chart.series.push(
        am5xy.SmoothedXLineSeries.new(root, {
          name: "Safe Runway Limit",
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: "safeTrajectory",
          categoryXField: "label",
          stroke: AM_COLORS.green,
          tooltip: createAmTooltip(root, currency),
        })
      );

      trajectorySeries.strokes.template.setAll({
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
        strokeOpacity: 0.8,
      });

      trajectorySeries.get("tooltip").label.set(
        "text",
        "{categoryX} Safe Runway: [medium]{valueY.formatNumber('#,###')}[/] " + currency
      );

      trajectorySeries.data.setAll(chartData);
      trajectorySeries.appear(500);
    }

    // Actual Spend Cumulative Line (Solid Coral)
    const actualSeries = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: "Actual Cumulative Spend",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "actualSpend",
        categoryXField: "label",
        stroke: AM_COLORS.accent,
        fill: AM_COLORS.accent,
        tooltip: createAmTooltip(root, currency),
      })
    );

    actualSeries.strokes.template.setAll({
      strokeWidth: 2,
    });

    actualSeries.fills.template.setAll({
      fillOpacity: 0.08,
      visible: true,
    });

    // Bullets on actual spend points
    actualSeries.bullets.push(() => {
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

    actualSeries.get("tooltip").label.set(
      "text",
      "{categoryX} Actual Spend: [medium]{valueY.formatNumber('#,###')}[/] " + currency
    );

    actualSeries.data.setAll(chartData);
    actualSeries.appear(500);

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
  }, [chartData, dailyAllowance, currency]);

  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No runway trajectory data</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-ink-subtle px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-red-400 shrink-0" />
          <span>Actual Spend Curve</span>
        </div>
        {dailyAllowance > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-emerald-400 shrink-0" />
            <span className="text-emerald-400">Safe Runway Trajectory</span>
          </div>
        )}
      </div>

      <div style={{ height: `${height}px` }} className="w-full relative">
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
