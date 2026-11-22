"use client";

import { useMemo, useState } from "react";
import { BiCalendar, BiInfoCircle } from "react-icons/bi";
import { cFormat } from "@/app/utils/currencyFormat";

export default function SpendingCalendarHeatmap({
  calendarHeatmap = [],
  dailyAllowance = 0,
  currency = "INR",
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Group cells into weeks starting Monday
  const { weeks, maxExpense } = useMemo(() => {
    if (!calendarHeatmap || calendarHeatmap.length === 0) {
      return { weeks: [], maxExpense: 0 };
    }

    let maxVal = 0;
    for (const cell of calendarHeatmap) {
      if (cell.expense > maxVal) maxVal = cell.expense;
    }

    // Mon = 0, Tue = 1, ... Sun = 6
    const getNormalizedDay = (dayOfWeek) => (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

    const firstCell = calendarHeatmap[0];
    const initialOffset = getNormalizedDay(firstCell.dayOfWeek);

    const weekRows = [];
    let currentWeek = Array(initialOffset).fill(null);

    for (const cell of calendarHeatmap) {
      currentWeek.push(cell);
      if (currentWeek.length === 7) {
        weekRows.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weekRows.push(currentWeek);
    }

    return { weeks: weekRows, maxExpense: maxVal };
  }, [calendarHeatmap]);

  const getIntensityClass = (expense) => {
    if (!expense || expense <= 0) {
      return "bg-surface-elevated/40 border-line-subtle/50 text-ink-muted hover:border-ink-muted/30";
    }

    const threshold = dailyAllowance > 0 ? dailyAllowance : maxExpense > 0 ? maxExpense * 0.5 : 1000;

    if (expense > threshold * 1.2) {
      return "bg-red-50 text-red-900 border-red-200 hover:border-red-400";
    }
    if (expense > threshold * 0.7) {
      return "bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400";
    }
    return "bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400";
  };

  if (!calendarHeatmap || calendarHeatmap.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-xs text-ink-subtle">
        <span>No calendar spending data available</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Legend & Details Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-ink-subtle">Intensity:</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-surface-elevated/60 border border-line-subtle" />
              <span className="text-ink-subtle">None</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
              <span className="text-emerald-800">Light</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
              <span className="text-amber-800">Moderate</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-200" />
              <span className="text-red-800">Heavy</span>
            </span>
          </div>
        </div>

        {hoveredCell && (
          <div className="flex items-center gap-2 text-xs font-medium text-ink-primary bg-surface-elevated px-2.5 py-1 rounded-lg border border-line-subtle animate-fade-in">
            <span>{hoveredCell.date}:</span>
            <span className="text-red-100 tabular-nums">
              {cFormat(hoveredCell.expense, { currency })}
            </span>
            <span className="text-ink-subtle font-normal">({hoveredCell.count} txns)</span>
          </div>
        )}
      </div>

      {/* 7-column Calendar Matrix */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="min-w-[420px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-ink-subtle pb-1">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-amber-700">Sat</span>
            <span className="text-amber-700">Sun</span>
          </div>

          {/* Grid Rows */}
          <div className="flex flex-col gap-1.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-1.5">
                {week.map((cell, cIdx) => {
                  if (!cell) {
                    return (
                      <div
                        key={cIdx}
                        className="h-10 rounded-lg bg-surface-elevated/10 border border-line-subtle/20"
                      />
                    );
                  }

                  const isHovered = hoveredCell?.date === cell.date;

                  return (
                    <div
                      key={cell.date}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-11 p-1 rounded-lg border flex flex-col justify-between transition-all cursor-pointer relative ${getIntensityClass(
                        cell.expense
                      )} ${isHovered ? "ring-2 ring-cta/50 scale-[1.03] z-10" : ""}`}
                    >
                      <div className="flex items-center justify-between text-[10px] leading-none">
                        <span className="font-normal opacity-80">{cell.day}</span>
                        {cell.count > 0 && (
                          <span className="opacity-60 tabular-nums">{cell.count}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium truncate text-right tabular-nums leading-tight">
                        {cell.expense > 0 ? cFormat(cell.expense, { currency }) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
