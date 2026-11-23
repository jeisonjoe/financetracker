"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BiCalendar,
  BiCalendarEvent,
  BiChevronDown,
  BiChevronLeft,
  BiChevronRight,
  BiCheck,
  BiX,
} from "react-icons/bi";
import {
  getPeriodDateBounds,
  parseLocalDate,
  toIsoDate,
  formatDateLabel,
  formatShortDate,
} from "@/app/utils/dateBounds";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "salary_cycle", label: "Salary Cycle" },
  { key: "all_time", label: "All Time" },
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function areDatesEqual(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isDateInRange(target, start, end) {
  if (!target || !start || !end) return false;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const [min, max] = s <= e ? [s, e] : [e, s];
  return t >= min && t <= max;
}

export default function PeriodSelector({ value = "this_month", onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Compute active bounds from global period value
  const activeBounds = useMemo(() => getPeriodDateBounds(value), [value]);

  // Current calendar view month/year
  const [viewDate, setViewDate] = useState(() => {
    if (activeBounds.startDate) {
      const p = parseLocalDate(activeBounds.startDate);
      if (p) return new Date(p.getFullYear(), p.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Range selection states inside the calendar
  const [rangeStart, setRangeStart] = useState(() =>
    activeBounds.startDate ? parseLocalDate(activeBounds.startDate) : null
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    activeBounds.endDate ? parseLocalDate(activeBounds.endDate) : null
  );
  const [hoverDate, setHoverDate] = useState(null);

  // Sync internal dates when activeBounds change or popover opens
  useEffect(() => {
    if (open) {
      if (activeBounds.startDate) {
        const s = parseLocalDate(activeBounds.startDate);
        const e = parseLocalDate(activeBounds.endDate || activeBounds.startDate);
        setRangeStart(s);
        setRangeEnd(e);
        if (s) setViewDate(new Date(s.getFullYear(), s.getMonth(), 1));
      } else {
        setRangeStart(null);
        setRangeEnd(null);
        const now = new Date();
        setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
      }
      setHoverDate(null);
    }
  }, [open, activeBounds]);

  // Handle click outside & escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Month navigation
  const prevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const goToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setRangeStart(now);
    setRangeEnd(now);
  };

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill 35 or 42 grid
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewDate]);

  // Handle day cell click
  const handleDateClick = (date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start a new selection
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      // Complete range selection
      if (date < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        setRangeEnd(date);
      }
    }
  };

  // Quick preset selection
  const handleSelectPreset = (key) => {
    onChange?.(key);
    setOpen(false);
  };

  // Apply custom range or single date
  const handleApplyCustom = () => {
    if (!rangeStart) return;
    const s = toIsoDate(rangeStart);
    const e = rangeEnd ? toIsoDate(rangeEnd) : s;
    const finalStart = s <= e ? s : e;
    const finalEnd = s <= e ? e : s;
    onChange?.(`custom:${finalStart}_${finalEnd}`);
    setOpen(false);
  };

  // Apply single day only
  const handleApplySingleDay = (date) => {
    const d = date || rangeStart || new Date();
    const iso = toIsoDate(d);
    onChange?.(`custom:${iso}_${iso}`);
    setOpen(false);
  };

  const isTodayDate = (date) => areDatesEqual(date, new Date());

  // Active selection summary text
  const selectionSummary = useMemo(() => {
    if (rangeStart && rangeEnd) {
      if (areDatesEqual(rangeStart, rangeEnd)) {
        return formatDateLabel(toIsoDate(rangeStart));
      }
      const s = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
      const e = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
      const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return `${formatShortDate(toIsoDate(s))} – ${formatDateLabel(toIsoDate(e))} (${diffDays} days)`;
    }
    if (rangeStart) {
      return `${formatDateLabel(toIsoDate(rangeStart))} (Click end date or Apply Day)`;
    }
    return activeBounds.label || "Select date or range";
  }, [rangeStart, rangeEnd, activeBounds]);

  const activePresetKey = PRESETS.some((p) => p.key === value) ? value : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        aria-label="Select Date Period"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-surface-elevated hover:bg-surface-hover border border-line-subtle text-ink-primary text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none"
      >
        <BiCalendar size={16} className="text-ink-secondary shrink-0" />
        <span className="truncate max-w-[150px] sm:max-w-[210px]">
          {activeBounds.label || "Select Period"}
        </span>
        <BiChevronDown
          size={16}
          className={`text-ink-subtle shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-surface-elevated border border-line-subtle rounded-2xl shadow-2xl p-4 w-[320px] sm:w-[440px] flex flex-col gap-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col sm:flex-row gap-3.5">
            {/* Presets Sidebar */}
            <div className="sm:w-[115px] shrink-0 flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0 sm:border-r border-line-subtle sm:pr-2.5">
              <span className="hidden sm:block text-[11px] font-medium text-ink-subtle px-2 pb-1.5">
                Presets
              </span>
              {PRESETS.map((p) => {
                const isActive = activePresetKey === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSelectPreset(p.key)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium text-left whitespace-nowrap transition-colors cursor-pointer flex items-center justify-between ${
                      isActive
                        ? "bg-tint-active text-ink-primary"
                        : "text-ink-muted hover:text-ink-primary hover:bg-tint"
                    }`}
                  >
                    <span>{p.label}</span>
                    {isActive && <BiCheck size={14} className="shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Calendar & Range Section */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {/* Month Navigator Header */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous Month"
                  className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-tint transition-colors cursor-pointer"
                >
                  <BiChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-ink-primary">
                    {viewDate.toLocaleString("en-US", { month: "long" })}{" "}
                    {viewDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-tint hover:bg-tint-hover text-ink-secondary transition-colors cursor-pointer font-medium"
                  >
                    Today
                  </button>
                </div>

                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next Month"
                  className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-tint transition-colors cursor-pointer"
                >
                  <BiChevronRight size={18} />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 text-center">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-[11px] font-medium text-ink-subtle py-1"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {calendarCells.map((cell, idx) => {
                  const { date, isCurrentMonth } = cell;
                  const isToday = isTodayDate(date);
                  const isStart = rangeStart && areDatesEqual(date, rangeStart);
                  const isEnd = rangeEnd && areDatesEqual(date, rangeEnd);
                  const isHoverInRange =
                    rangeStart &&
                    !rangeEnd &&
                    hoverDate &&
                    isDateInRange(date, rangeStart, hoverDate);
                  const isInSelectedRange =
                    rangeStart &&
                    rangeEnd &&
                    isDateInRange(date, rangeStart, rangeEnd);

                  const isRangeBoundary = isStart || isEnd;
                  const isSingleSelected =
                    (isStart && !rangeEnd) ||
                    (isStart && isEnd && areDatesEqual(rangeStart, rangeEnd));

                  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
                  const isRowStart = dayOfWeek === 0;
                  const isRowEnd = dayOfWeek === 6;

                  let containerClass = "relative h-8 flex items-center justify-center w-full";
                  if (isSingleSelected) {
                    containerClass += " bg-transparent";
                  } else if (isStart && isEnd) {
                    containerClass += " bg-tint-active rounded-full";
                  } else if (isStart) {
                    containerClass += ` bg-tint-active ${isRowEnd ? "rounded-full" : "rounded-l-full"}`;
                  } else if (isEnd) {
                    containerClass += ` bg-tint-active ${isRowStart ? "rounded-full" : "rounded-r-full"}`;
                  } else if (isInSelectedRange || isHoverInRange) {
                    containerClass += " bg-tint";
                    if (isRowStart && isRowEnd) {
                      containerClass += " rounded-full";
                    } else if (isRowStart) {
                      containerClass += " rounded-l-full";
                    } else if (isRowEnd) {
                      containerClass += " rounded-r-full";
                    } else {
                      containerClass += " rounded-none";
                    }
                  }

                  let btnClass = "w-full h-full text-xs flex items-center justify-center transition-colors cursor-pointer ";
                  if (isSingleSelected) {
                    btnClass += "bg-tint-active text-ink-primary font-medium rounded-full";
                  } else if (isStart || isEnd) {
                    btnClass += "text-ink-primary font-medium";
                  } else if (isInSelectedRange || isHoverInRange) {
                    btnClass += "text-ink-primary font-normal";
                  } else if (isCurrentMonth) {
                    btnClass += "text-ink-body hover:bg-tint rounded-full";
                  } else {
                    btnClass += "text-ink-faint hover:bg-tint/50 rounded-full";
                  }

                  if (isToday && !isRangeBoundary && !isSingleSelected) {
                    btnClass += " ring-1 ring-line-focus font-medium";
                  }

                  return (
                    <div key={idx} className={containerClass}>
                      <button
                        type="button"
                        onClick={() => handleDateClick(date)}
                        onMouseEnter={() => setHoverDate(date)}
                        className={btnClass}
                      >
                        {date.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selection Banner & Bottom Actions */}
          <div className="pt-3 border-t border-line-subtle flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="text-[11px] text-ink-secondary truncate max-w-full flex items-center gap-1.5">
              <BiCalendarEvent size={14} className="text-accent shrink-0" />
              <span className="truncate">{selectionSummary}</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {rangeStart && !rangeEnd && (
                <button
                  type="button"
                  onClick={() => handleApplySingleDay(rangeStart)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-tint hover:bg-tint-hover text-ink-primary transition-colors cursor-pointer"
                >
                  This Day Only
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs text-ink-muted hover:text-ink-primary hover:bg-tint transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!rangeStart}
                onClick={handleApplyCustom}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] cursor-pointer ${
                  rangeStart
                    ? "bg-cta text-cta-ink hover:bg-cta-hover"
                    : "bg-surface-elevated text-ink-faint cursor-not-allowed opacity-50"
                }`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
