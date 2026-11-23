"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import { BiChevronLeft, BiLayer } from "react-icons/bi";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, AM_PALETTE, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function CategoryDrilldownChart({
  categories = [],
  currency = "INR",
  height = 240,
}) {
  const chartRef = useRef(null);
  const chartId = useId();
  const [selectedParentName, setSelectedParentName] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Active category context
  const selectedParent = useMemo(() => {
    if (!selectedParentName) return null;
    return categories.find((c) => c.name === selectedParentName) || null;
  }, [categories, selectedParentName]);

  const { displayItems, totalAmount, title, isDrilldown } = useMemo(() => {
    if (selectedParent) {
      // Viewing subcategories for selected parent
      const subs = (selectedParent.subcategories || []).filter((s) => (s.spent || 0) > 0);
      const subTotal = subs.reduce((sum, s) => sum + (s.spent || 0), 0);
      const unassigned = Math.max(0, (selectedParent.spent || 0) - subTotal);

      const items = subs.map((s, idx) => ({
        name: s.name,
        spent: s.spent || 0,
        color: AM_PALETTE[idx % AM_PALETTE.length],
      }));

      if (unassigned > 0 || items.length === 0) {
        items.push({
          name: items.length > 0 ? "General / Direct" : selectedParent.name,
          spent: unassigned > 0 ? unassigned : selectedParent.spent || 0,
          color: AM_PALETTE[items.length % AM_PALETTE.length],
        });
      }

      const total = items.reduce((sum, i) => sum + i.spent, 0);

      return {
        isDrilldown: true,
        title: selectedParent.name,
        totalAmount: total,
        displayItems: items,
      };
    }

    // Top-level parent categories
    const valid = categories.filter((c) => (c.spent || 0) > 0);
    const top = valid.slice(0, 8);
    const other = valid.slice(8);

    const items = top.map((c, idx) => ({
      name: c.name,
      spent: c.spent || 0,
      color: AM_PALETTE[idx % AM_PALETTE.length],
      hasSubcategories: Array.isArray(c.subcategories) && c.subcategories.length > 0,
    }));

    if (other.length > 0) {
      const otherSpent = other.reduce((sum, c) => sum + (c.spent || 0), 0);
      items.push({
        name: "Other Categories",
        spent: otherSpent,
        color: am5.color("#94a3b8"),
        hasSubcategories: false,
      });
    }

    const total = items.reduce((sum, i) => sum + i.spent, 0);

    return {
      isDrilldown: false,
      title: "All Categories",
      totalAmount: total,
      displayItems: items,
    };
  }, [categories, selectedParent]);

  useEffect(() => {
    if (!chartRef.current || displayItems.length === 0 || totalAmount === 0) return;

    const root = createAmChartsRoot(chartRef.current);
    if (!root) return;

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(70),
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
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

    // Hide outer callout labels for clean modern minimalist look
    series.labels.template.set("visible", false);
    series.ticks.template.set("visible", false);

    // Slices styling and interactions
    series.slices.template.setAll({
      strokeWidth: 2,
      stroke: AM_COLORS.surfaceElevated,
      cornerRadius: 4,
      templateField: "sliceSettings",
      interactive: true,
      cursorOverStyle: "pointer",
    });

    // Custom colors & slice settings
    const data = displayItems.map((item) => ({
      name: item.name,
      spent: item.spent,
      sliceSettings: {
        fill: item.color,
      },
    }));

    // Tooltip format
    series.slices.template.set("tooltipText", "{category}: [medium]{value.formatNumber('#,###')}[/] " + currency + " ({valuePercentTotal.formatNumber('0.0')}%)");

    // Click slice to drilldown
    series.slices.template.events.on("click", (ev) => {
      const clickedName = ev.target.dataItem?.dataContext?.name;
      if (!isDrilldown && clickedName) {
        const found = categories.find((c) => c.name === clickedName);
        if (found && Array.isArray(found.subcategories) && found.subcategories.length > 0) {
          setSelectedParentName(clickedName);
        }
      }
    });

    // Hover slice to update center readout
    series.slices.template.events.on("pointerover", (ev) => {
      const context = ev.target.dataItem?.dataContext;
      if (context) {
        setHoveredItem({
          name: context.name,
          spent: context.spent,
          pct: totalAmount > 0 ? Math.round((context.spent / totalAmount) * 100) : 0,
        });
      }
    });

    series.slices.template.events.on("pointerout", () => {
      setHoveredItem(null);
    });

    series.data.setAll(data);
    series.appear(600, 100);

    return () => {
      root.dispose();
    };
  }, [displayItems, totalAmount, currency, isDrilldown, categories]);

  if (!categories || categories.length === 0 || totalAmount === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex flex-col items-center justify-center text-xs text-ink-subtle"
      >
        <span>No category spending data for this period</span>
      </div>
    );
  }

  const centerDisplayTitle = hoveredItem?.name || title;
  const centerDisplayAmount = hoveredItem?.spent ?? totalAmount;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Drilldown Back Navigation */}
      {isDrilldown && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => {
              setSelectedParentName(null);
              setHoveredItem(null);
            }}
            className="flex items-center gap-1 text-xs text-ink-secondary hover:text-ink-primary font-medium px-2 py-1 rounded-lg bg-surface-hover transition-colors cursor-pointer"
          >
            <BiChevronLeft size={16} />
            <span>All Categories</span>
          </button>
          <span className="text-xs text-ink-subtle font-medium truncate max-w-[180px]">
            {selectedParentName}
          </span>
        </div>
      )}

      {/* Donut Chart Container */}
      <div style={{ height: `${height}px` }} className="w-full relative flex items-center justify-center">
        <div ref={chartRef} className="w-full h-full" />

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[11px] text-ink-subtle font-normal truncate max-w-[120px]">
            {centerDisplayTitle}
          </span>
          <span className="text-sm font-semibold text-ink-primary tabular-nums">
            {cFormat(centerDisplayAmount, { currency })}
          </span>
          {hoveredItem && (
            <span className="text-[10px] text-ink-muted">
              {hoveredItem.pct}%
            </span>
          )}
        </div>
      </div>

      {/* Category Pills Breakdown */}
      <div className="flex flex-wrap gap-1.5 pt-1 max-h-[96px] overflow-y-auto">
        {displayItems.map((item) => {
          const pct = totalAmount > 0 ? Math.round((item.spent / totalAmount) * 100) : 0;
          const isClickable = !isDrilldown && item.hasSubcategories;

          return (
            <button
              key={item.name}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (isClickable) {
                  setSelectedParentName(item.name);
                  setHoveredItem(null);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                isClickable
                  ? "bg-surface-elevated hover:bg-surface-hover border border-line-subtle text-ink-secondary cursor-pointer"
                  : "bg-surface-elevated/40 text-ink-muted cursor-default border border-line-subtle/50"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: typeof item.color === "object" ? item.color.toCSSHex() : item.color }}
              />
              <span className="truncate max-w-[110px]">{item.name}</span>
              <span className="text-ink-subtle font-normal">{pct}%</span>
              {isClickable && (
                <BiLayer size={12} className="text-ink-subtle shrink-0 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
