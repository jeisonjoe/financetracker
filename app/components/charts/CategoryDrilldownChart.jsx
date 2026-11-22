"use client";

import { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { BiChevronLeft, BiLayer } from "react-icons/bi";
import "./ChartConfig";
import { CHART_PALETTE, COMMON_TOOLTIP_STYLE } from "./ChartConfig";
import { cFormat } from "@/app/utils/currencyFormat";

export default function CategoryDrilldownChart({
  categories = [],
  currency = "INR",
  height = 240,
  cutout = "70%",
}) {
  const [selectedParentName, setSelectedParentName] = useState(null);

  // Active category context
  const selectedParent = useMemo(() => {
    if (!selectedParentName) return null;
    return categories.find((c) => c.name === selectedParentName) || null;
  }, [categories, selectedParentName]);

  const { chartData, displayItems, totalAmount, title, isDrilldown } = useMemo(() => {
    if (selectedParent) {
      // Viewing subcategories for selected parent
      const subs = (selectedParent.subcategories || []).filter((s) => (s.spent || 0) > 0);
      const subTotal = subs.reduce((sum, s) => sum + (s.spent || 0), 0);
      const unassigned = Math.max(0, (selectedParent.spent || 0) - subTotal);

      const items = subs.map((s, idx) => ({
        name: s.name,
        spent: s.spent || 0,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }));

      if (unassigned > 0 || items.length === 0) {
        items.push({
          name: items.length > 0 ? "General / Direct" : selectedParent.name,
          spent: unassigned > 0 ? unassigned : selectedParent.spent || 0,
          color: CHART_PALETTE[items.length % CHART_PALETTE.length],
        });
      }

      const total = items.reduce((sum, i) => sum + i.spent, 0);

      return {
        isDrilldown: true,
        title: selectedParent.name,
        totalAmount: total,
        displayItems: items,
        chartData: {
          labels: items.map((i) => i.name),
          datasets: [
            {
              data: items.map((i) => i.spent),
              backgroundColor: items.map((i) => i.color),
              borderColor: "transparent",
              borderWidth: 0,
              hoverOffset: 4,
            },
          ],
        },
      };
    }

    // Top-level parent categories
    const valid = categories.filter((c) => (c.spent || 0) > 0);
    const top = valid.slice(0, 8);
    const other = valid.slice(8);

    const items = top.map((c, idx) => ({
      name: c.name,
      spent: c.spent || 0,
      color: c.color || CHART_PALETTE[idx % CHART_PALETTE.length],
      hasSubcategories: Array.isArray(c.subcategories) && c.subcategories.length > 0,
    }));

    if (other.length > 0) {
      const otherSpent = other.reduce((sum, c) => sum + (c.spent || 0), 0);
      items.push({
        name: "Other Categories",
        spent: otherSpent,
        color: "#94a3b8",
        hasSubcategories: false,
      });
    }

    const total = items.reduce((sum, i) => sum + i.spent, 0);

    return {
      isDrilldown: false,
      title: "All Categories",
      totalAmount: total,
      displayItems: items,
      chartData: {
        labels: items.map((i) => i.name),
        datasets: [
          {
            data: items.map((i) => i.spent),
            backgroundColor: items.map((i) => i.color),
            borderColor: "transparent",
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
    };
  }, [categories, selectedParent]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      onClick: (_event, elements) => {
        if (!isDrilldown && elements.length > 0) {
          const index = elements[0].index;
          const clickedItem = displayItems[index];
          if (clickedItem && clickedItem.name !== "Other Categories") {
            const parent = categories.find((c) => c.name === clickedItem.name);
            if (parent && parent.subcategories && parent.subcategories.length > 0) {
              setSelectedParentName(clickedItem.name);
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...COMMON_TOOLTIP_STYLE,
          callbacks: {
            title: () => "",
            label: function (context) {
              const label = context.label || "";
              const val = context.parsed || 0;
              const pct = totalAmount > 0 ? Math.round((val / totalAmount) * 100) : 0;
              const subHint =
                !isDrilldown && categories.find((c) => c.name === label)?.subcategories?.length > 0
                  ? " (Click to view subcategories)"
                  : "";
              return ` ${label}: ${cFormat(val, { currency })} (${pct}%)${subHint}`;
            },
          },
        },
      },
    };
  }, [cutout, isDrilldown, displayItems, totalAmount, currency, categories]);

  if (!categories || categories.length === 0 || totalAmount === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="w-full flex flex-col items-center justify-center text-xs text-ink-subtle"
      >
        <span>No category spending data available</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Navigation Header */}
      <div className="flex items-center justify-between text-xs text-ink-secondary">
        <div className="flex items-center gap-1.5 min-w-0">
          {isDrilldown ? (
            <button
              type="button"
              onClick={() => setSelectedParentName(null)}
              className="inline-flex items-center gap-1 text-cta hover:text-cta/80 transition-colors font-medium cursor-pointer"
            >
              <BiChevronLeft size={16} />
              <span>All Categories</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-ink-subtle">
              <BiLayer size={14} />
              <span>Click a category to drill down</span>
            </span>
          )}
          {isDrilldown && (
            <>
              <span className="text-ink-muted">/</span>
              <span className="text-ink-primary font-medium truncate">{title}</span>
            </>
          )}
        </div>
        <span className="text-ink-subtle tabular-nums">
          {displayItems.length} {isDrilldown ? "subcategories" : "categories"}
        </span>
      </div>

      {/* Doughnut Chart */}
      <div style={{ height: `${height}px` }} className="w-full relative flex items-center justify-center">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[11px] text-ink-subtle truncate max-w-[130px]">{title}</span>
          <span className="text-sm sm:text-base font-medium text-ink-primary tabular-nums">
            {cFormat(totalAmount, { currency })}
          </span>
        </div>
      </div>

      {/* Interactive Legend / Breakdown Pills */}
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pt-1">
        {displayItems.map((item) => {
          const pct = totalAmount > 0 ? Math.round((item.spent / totalAmount) * 100) : 0;
          const canDrill = !isDrilldown && item.hasSubcategories;

          return (
            <button
              key={item.name}
              type="button"
              disabled={!canDrill}
              onClick={() => canDrill && setSelectedParentName(item.name)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border transition-all ${
                canDrill
                  ? "bg-surface-elevated/70 border-line-subtle hover:border-cta/40 hover:bg-tint cursor-pointer"
                  : "bg-surface-elevated/30 border-line-subtle/60 cursor-default"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-ink-primary truncate max-w-[110px]">{item.name}</span>
              <span className="text-ink-subtle tabular-nums font-normal">{pct}%</span>
              {canDrill && <span className="text-cta text-[10px]">↳</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
