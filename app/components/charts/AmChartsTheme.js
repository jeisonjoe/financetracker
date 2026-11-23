"use client";

import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import { cFormat } from "@/app/utils/currencyFormat";

/**
 * Standard FinTrack color palette for amCharts 5
 */
export const AM_PALETTE = [
  am5.color("#38bdf8"), // Sky
  am5.color("#4ade80"), // Green
  am5.color("#fb923c"), // Orange
  am5.color("#a78bfa"), // Violet
  am5.color("#f472b6"), // Pink
  am5.color("#facc15"), // Yellow
  am5.color("#2dd4bf"), // Teal
  am5.color("#e879f9"), // Fuchsia
  am5.color("#94a3b8"), // Slate
  am5.color("#818cf8"), // Indigo
];

export const AM_COLORS = {
  accent: am5.color("#e16449"),
  green: am5.color("#4ade80"),
  sky: am5.color("#38bdf8"),
  inkPrimary: am5.color("#e6e6ea"),
  inkSecondary: am5.color("#c8c8cf"),
  inkMuted: am5.color("#9696a2"),
  inkSubtle: am5.color("#7c7c88"),
  grid: am5.color("#ffffff"),
  surfaceElevated: am5.color("#18181b"),
  borderSubtle: am5.color("#27272a"),
};

/**
 * Creates and configures a styled am5.Root for FinTrack charts
 */
export function createAmChartsRoot(container) {
  if (!container) return null;
  const root = am5.Root.new(container);

  // Animated and Dark themes
  root.setThemes([
    am5themes_Animated.new(root),
    am5themes_Dark.new(root),
  ]);

  // Remove watermark if present
  if (root._logo) {
    root._logo.dispose();
  }

  return root;
}

/**
 * Formats a tooltip in amCharts with consistent dark surface and border
 */
export function createAmTooltip(root, currency = "INR") {
  const tooltip = am5.Tooltip.new(root, {
    getFillFromSprite: false,
    autoTextColor: false,
  });

  tooltip.get("background").setAll({
    fill: am5.color("#18181b"),
    fillOpacity: 0.98,
    stroke: am5.color("#3f3f46"),
    strokeWidth: 1,
    cornerRadius: 8,
    shadowColor: am5.color("#000000"),
    shadowBlur: 10,
    shadowOpacity: 0.35,
  });

  tooltip.label.setAll({
    fill: am5.color("#e6e6ea"),
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "var(--font-inter, system-ui, sans-serif)",
  });

  return tooltip;
}
