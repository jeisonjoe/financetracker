"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import { cFormat } from "@/app/utils/currencyFormat";
import { AM_COLORS, AM_PALETTE, createAmChartsRoot, createAmTooltip } from "./AmChartsTheme";

export default function WalletDistributionChart({
  wallets = [],
  currency = "INR",
  height = 180,
}) {
  const chartRef = useRef(null);
  const [hoveredWallet, setHoveredWallet] = useState(null);

  const { positiveWallets, totalBalance } = useMemo(() => {
    const positive = wallets.filter((w) => (Number(w.balance) || 0) > 0);
    const total = positive.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);

    return {
      positiveWallets: positive,
      totalBalance: total,
    };
  }, [wallets]);

  useEffect(() => {
    if (!chartRef.current || positiveWallets.length === 0 || totalBalance === 0) return;

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
        valueField: "balance",
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

    const data = positiveWallets.map((w, idx) => ({
      name: w.name,
      balance: Number(w.balance) || 0,
      sliceSettings: {
        fill: AM_PALETTE[idx % AM_PALETTE.length],
      },
    }));

    series.slices.template.set(
      "tooltipText",
      "[#a1a1aa]{category}:[/] [#e6e6ea]{value.formatNumber('#,###')} " + currency + "[/] [#c8c8cf]({valuePercentTotal.formatNumber('0.0')}%) [/]"
    );

    series.slices.template.events.on("pointerover", (ev) => {
      const context = ev.target.dataItem?.dataContext;
      if (context) {
        setHoveredWallet({
          name: context.name,
          balance: context.balance,
          pct: totalBalance > 0 ? Math.round((context.balance / totalBalance) * 100) : 0,
        });
      }
    });

    series.slices.template.events.on("pointerout", () => {
      setHoveredWallet(null);
    });

    series.data.setAll(data);
    series.appear(500, 100);

    return () => {
      root.dispose();
    };
  }, [positiveWallets, totalBalance, currency]);

  if (positiveWallets.length === 0 || totalBalance === 0) {
    return null;
  }

  const centerTitle = hoveredWallet?.name || "Liquid Assets";
  const centerAmount = hoveredWallet?.balance ?? totalBalance;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div style={{ height: `${height}px`, width: `${height}px` }} className="relative shrink-0 flex items-center justify-center">
        <div ref={chartRef} className="w-full h-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          <span className="text-[10px] text-ink-subtle truncate max-w-[90px]">{centerTitle}</span>
          <span className="text-xs font-semibold text-ink-primary tabular-nums">
            {cFormat(centerAmount, { currency })}
          </span>
          {hoveredWallet && (
            <span className="text-[10px] text-ink-muted">
              {hoveredWallet.pct}%
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 grow justify-center sm:justify-start">
        {positiveWallets.map((w, i) => {
          const bal = Number(w.balance) || 0;
          const pct = totalBalance > 0 ? Math.round((bal / totalBalance) * 100) : 0;
          const color = AM_PALETTE[i % AM_PALETTE.length];
          return (
            <div key={w.id || w.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color.toCSSHex() }}
              />
              <span className="text-ink-secondary">{w.name}</span>
              <span className="text-ink-subtle font-normal">
                {cFormat(bal, { currency })} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
