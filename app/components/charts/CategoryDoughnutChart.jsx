"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, AM_PALETTE, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function CategoryDoughnutChart({
  categories = [],
  currency = "INR",
  height = 180,
  showCenterText = true,
}) {
  const chartRef = useRef(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const { items, totalSpent } = useMemo(() => {
    const valid = categories.filter((c) => (c.spent || 0) > 0);
    const top = valid.slice(0, 8);
    const other = valid.slice(8);

    const list = top.map((c, idx) => ({
      name: c.name,
      spent: c.spent || 0,
      color: AM_PALETTE[idx % AM_PALETTE.length],
    }));

    if (other.length > 0) {
      const otherSpent = other.reduce((sum, c) => sum + (c.spent || 0), 0);
      list.push({
        name: "Other Categories",
        spent: otherSpent,
        color: am5.color("#94a3b8"),
      });
    }

    const total = list.reduce((sum, v) => sum + v.spent, 0);

    return {
      items: list,
      totalSpent: total,
    };
  }, [categories]);

  useEffect(() => {
    if (!chartRef.current || items.length === 0 || totalSpent === 0) return;

    const root = createAmChartsRoot(chartRef.current);
    if (!root) return;

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(72),
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "spent",
        categoryField: "name",
        alignLabels: false,
        tooltip: createAmTooltip(root, currency),
      })
    );

    series.labels.template.set("visible", false);
    series.ticks.template.set("visible", false);

    series.slices.template.setAll({
      strokeWidth: 2,
      stroke: AM_COLORS.surfaceElevated,
      cornerRadius: 4,
      templateField: "sliceSettings",
      interactive: true,
      cursorOverStyle: "pointer",
    });

    const data = items.map((item) => ({
      name: item.name,
      spent: item.spent,
      sliceSettings: {
        fill: item.color,
      },
    }));

    series.slices.template.set(
      "tooltipText",
      "{category}: [medium]{value.formatNumber('#,###')}[/] " + currency + " ({valuePercentTotal.formatNumber('0.0')}%)"
    );

    series.slices.template.events.on("pointerover", (ev) => {
      const context = ev.target.dataItem?.dataContext;
      if (context) {
        setHoveredCategory({
          name: context.name,
          spent: context.spent,
          pct: totalSpent > 0 ? Math.round((context.spent / totalSpent) * 100) : 0,
        });
      }
    });

    series.slices.template.events.on("pointerout", () => {
      setHoveredCategory(null);
    });

    series.data.setAll(data);
    series.appear(500, 100);

    return () => {
      root.dispose();
    };
  }, [items, totalSpent, currency]);

  if (!categories || categories.length === 0 || totalSpent === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex flex-col items-center justify-center text-xs text-ink-subtle"
      >
        <span>No spending data to visualize</span>
      </div>
    );
  }

  const centerTitle = hoveredCategory?.name || "Total Spend";
  const centerAmount = hoveredCategory?.spent ?? totalSpent;

  return (
    <div style={{ height: `${height}px` }} className="w-full relative flex items-center justify-center">
      <div ref={chartRef} className="w-full h-full" />

      {showCenterText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[10px] text-ink-subtle truncate max-w-[100px]">
            {centerTitle}
          </span>
          <span className="text-xs font-semibold text-ink-primary tabular-nums">
            {cFormat(centerAmount, { currency })}
          </span>
          {hoveredCategory && (
            <span className="text-[10px] text-ink-muted">
              {hoveredCategory.pct}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
