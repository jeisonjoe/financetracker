"use client";

import { useEffect, useMemo, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, AM_PALETTE, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function TagSpendChart({
  tagBreakdown = [],
  currency = "INR",
  height = 180,
}) {
  const chartRef = useRef(null);

  const { data, hasData } = useMemo(() => {
    const top = tagBreakdown.slice(0, 6);
    if (top.length === 0) return { data: [], hasData: false };

    const items = top.map((t, idx) => ({
      tag: `#${t.tag.replace(/^#/, "")}`,
      spent: t.spent || 0,
      columnSettings: {
        fill: AM_PALETTE[idx % AM_PALETTE.length],
      },
    }));

    return { data: items, hasData: true };
  }, [tagBreakdown]);

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
        paddingTop: 4,
        paddingBottom: 4,
      })
    );

    // Category Y Axis (Horizontal)
    const yRenderer = am5xy.AxisRendererY.new(root, {
      inversed: true,
      minGridDistance: 24,
    });
    yRenderer.grid.template.set("visible", false);
    yRenderer.labels.template.setAll({
      fill: AM_COLORS.inkSecondary,
      fontSize: 11,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    });

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "tag",
        renderer: yRenderer,
      })
    );
    yAxis.data.setAll(data);

    // Value X Axis
    const xRenderer = am5xy.AxisRendererX.new(root, {});
    xRenderer.grid.template.setAll({
      stroke: AM_COLORS.grid,
      strokeOpacity: 0.04,
    });
    xRenderer.labels.template.setAll({
      fill: AM_COLORS.inkSubtle,
      fontSize: 10,
      fontFamily: "var(--font-inter, system-ui, sans-serif)",
    });

    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: xRenderer,
        numberFormat: "#a",
      })
    );

    // Column Series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Spent",
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: "spent",
        categoryYField: "tag",
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.columns.template.setAll({
      cornerRadiusTR: 4,
      cornerRadiusBR: 4,
      height: am5.percent(60),
      templateField: "columnSettings",
      strokeOpacity: 0,
      fillOpacity: 0.85,
    });

    series.columns.template.states.create("hover", {
      fillOpacity: 1,
    });

    series.get("tooltip").label.set(
      "text",
      "[#a1a1aa]{categoryY}:[/] [#e6e6ea]{valueX.formatNumber('#,###')} " + currency + "[/]"
    );

    series.data.setAll(data);
    series.appear(500);

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
        <span>No tag spending data available</span>
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full relative">
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
}
