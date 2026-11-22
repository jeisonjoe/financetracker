"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Standard cohesive palette matching FinTrack design tokens
export const CHART_PALETTE = [
  "#38bdf8", // Sky
  "#4ade80", // Green
  "#fb923c", // Orange
  "#a78bfa", // Violet
  "#f472b6", // Pink
  "#facc15", // Yellow
  "#2dd4bf", // Teal
  "#e879f9", // Fuchsia
  "#94a3b8", // Slate
  "#818cf8", // Indigo
];

export const CHART_FONT = {
  family: "var(--font-inter, system-ui, -apple-system, sans-serif)",
  size: 11,
  weight: 400,
};

export const COMMON_TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  titleColor: "#f4f4f5",
  bodyColor: "#d4d4d8",
  borderColor: "rgba(255, 255, 255, 0.12)",
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  titleFont: {
    family: "var(--font-inter, system-ui, sans-serif)",
    size: 12,
    weight: 500,
  },
  bodyFont: {
    family: "var(--font-inter, system-ui, sans-serif)",
    size: 11,
    weight: 400,
  },
  boxPadding: 4,
};
