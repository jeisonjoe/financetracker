"use client";

import { useEffect, useMemo, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function DayOfWeekSpendChart({
  dayOfWeekProfile = null,
  currency = "INR",
  height = 200,
}) {
  const chartRef = useRef(null);
  const days = dayOfWeekProfile?.days || [];

  const { data, hasData } = useMemo(() => {
    if (!days || days.length === 0) return { data: [], hasData: false };

    const items = days.map((d) => {
      const isWeekend = d.day === "Sat" || d.day === "Sun";
      return {
        day: d.day,
        spent: d.totalSpent || 0,
        columnSettings: {
          fill: isWeekend ? am5.color("#fb923c") : am5.color("#818cf8"),
        },
      };
    });

    return { data: items, hasData: true };
  }, [days]);

  useEffect(() => {
    if (!chartRef.current || !hasData || data.length === 0) return;

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
      minGridDistance: 24,
      cellStartLocation: 0.1,
      cellEndLocation: 0.9,
    });
    xRenderer.grid.template.set("visible", false);
    xRenderer.labels.template.setAll({
      fill: AM_COLORS.inkSubtle,
      fontSize: 10,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "day",
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

    // Column Series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Day Spend",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "spent",
        categoryXField: "day",
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.columns.template.setAll({
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      width: am5.percent(60),
      templateField: "columnSettings",
      strokeOpacity: 0,
      fillOpacity: 0.85,
    });

    series.columns.template.states.create("hover", {
      fillOpacity: 1,
    });

    series.get("tooltip").label.set(
      "text",
      "[#a1a1aa]{categoryX}:[/] [#e6e6ea font-medium]{valueY.formatNumber('#,###')} " + currency + "[/]"
    );

    series.data.setAll(data);
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
  }, [data, hasData, currency]);

  if (!hasData) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No day-of-week data available</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-ink-subtle px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 shrink-0" />
          <span>Weekdays (Mon - Fri)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 shrink-0" />
          <span>Weekend (Sat - Sun)</span>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="w-full relative">
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
