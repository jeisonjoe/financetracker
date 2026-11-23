"use client";

import { useEffect, useMemo, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function DebtsBarChart({
  contacts = [],
  currency = "INR",
  height = 180,
}) {
  const chartRef = useRef(null);

  const { activeContacts, hasData } = useMemo(() => {
    const active = contacts
      .filter((c) => Math.abs(Number(c.balance) || 0) > 0)
      .slice(0, 8);

    if (active.length === 0) {
      return { activeContacts: [], hasData: false };
    }

    const data = active.map((c) => {
      const balance = Number(c.balance) || 0;
      const isPositive = balance > 0;
      return {
        name: c.name,
        balance,
        columnSettings: {
          fill: isPositive ? AM_COLORS.green : AM_COLORS.accent,
        },
      };
    });

    return { activeContacts: data, hasData: true };
  }, [contacts]);

  useEffect(() => {
    if (!chartRef.current || !hasData || activeContacts.length === 0) return;

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

    // Category Y Axis (Horizontal Bar Chart)
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
        categoryField: "name",
        renderer: yRenderer,
      })
    );
    yAxis.data.setAll(activeContacts);

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

    // Zero Line Guide
    const zeroDataItem = xAxis.makeDataItem({
      value: 0,
    });
    const zeroRange = xAxis.createAxisRange(zeroDataItem);
    zeroRange.get("grid").setAll({
      stroke: AM_COLORS.inkSubtle,
      strokeWidth: 1,
      strokeOpacity: 0.4,
      visible: true,
    });

    // Column Series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Net Balance",
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: "balance",
        categoryYField: "name",
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.columns.template.setAll({
      cornerRadiusTR: 4,
      cornerRadiusBR: 4,
      cornerRadiusTL: 4,
      cornerRadiusBL: 4,
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
      "{categoryY}: [medium]{valueX.formatNumber('#,###')}[/] " + currency
    );

    series.data.setAll(activeContacts);
    series.appear(500);

    chart.appear(600, 100);

    return () => {
      root.dispose();
    };
  }, [activeContacts, hasData, currency]);

  if (!hasData) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No outstanding peer balances</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-ink-subtle px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shrink-0" />
          <span>Owes You (Asset)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0" />
          <span>You Owe (Debt)</span>
        </div>
      </div>

      <div style={{ height: `${height}px` }} className="w-full relative">
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
