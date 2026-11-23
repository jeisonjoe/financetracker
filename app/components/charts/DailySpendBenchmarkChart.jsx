"use client";

import { useEffect, useRef } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function DailySpendBenchmarkChart({
  dailyTrend = [],
  dailyAllowance = 0,
  avgDailySpend = 0,
  currency = "INR",
  height = 200,
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

    const data = dailyTrend.map((d) => {
      const expense = d.expense || 0;
      const isOver = dailyAllowance > 0 && expense > dailyAllowance;
      return {
        label: d.label || d.date,
        expense,
        columnSettings: {
          fill: isOver ? AM_COLORS.accent : AM_COLORS.sky,
        },
      };
    });

    // Category X Axis
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 32,
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

    // Safe Daily Limit Benchmark Guide Line
    if (dailyAllowance > 0) {
      const rangeDataItem = yAxis.makeDataItem({
        value: dailyAllowance,
      });
      const range = yAxis.createAxisRange(rangeDataItem);

      range.get("grid").setAll({
        stroke: AM_COLORS.green,
        strokeWidth: 1.5,
        strokeDasharray: [4, 4],
        strokeOpacity: 0.8,
        visible: true,
      });

      range.get("label").setAll({
        text: `Safe Limit (${cFormat(dailyAllowance, { currency })})`,
        fill: AM_COLORS.green,
        fontSize: 10,
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        inside: true,
        location: 0.95,
        visible: true,
      });
    }

    // Daily Spend Column Series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Daily Spend",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "expense",
        categoryXField: "label",
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.columns.template.setAll({
      cornerRadiusTL: 4,
      cornerRadiusTR: 4,
      width: am5.percent(65),
      templateField: "columnSettings",
      fillOpacity: 0.85,
      strokeOpacity: 0,
    });

    series.columns.template.states.create("hover", {
      fillOpacity: 1,
    });

    series.get("tooltip").label.set(
      "text",
      "{categoryX}: [medium]{valueY.formatNumber('#,###')}[/] " + currency
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
  }, [dailyTrend, dailyAllowance, currency]);

  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex items-center justify-center text-xs text-ink-subtle"
      >
        <span>No daily spend trend available</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Legend & Stats Indicator */}
      <div className="flex items-center justify-between text-xs text-ink-subtle px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 shrink-0" />
            <span>Within Limit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0" />
            <span>Over Limit</span>
          </div>
          {dailyAllowance > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-emerald-400 shrink-0" />
              <span className="text-emerald-400">Safe Runway</span>
            </div>
          )}
        </div>
        {avgDailySpend > 0 && (
          <span className="tabular-nums">
            Avg: <strong className="font-medium text-ink-primary">{cFormat(avgDailySpend, { currency })}/day</strong>
          </span>
        )}
      </div>

      <div style={{ height: `${height}px` }} className="w-full relative">
        <div ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
}
