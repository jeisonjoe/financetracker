import React, { useState, useMemo } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

// Simple, dependency-free month-picker calendar component
// - Tailwind CSS utility classes assumed to be available
// - Default export is a React component
// Props:
//  - value: Date | null (controlled selected date)
//  - defaultValue: Date (initial selected date for uncontrolled)
//  - onChange: fn(Date) called when user picks a date
//  - events: Array of { date: 'YYYY-MM-DD', color?: 'bg-red-500'|'bg-blue-500', title?: string }
//  - showWeekNumbers: boolean

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function areSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatISODate(d) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({
  value,
  defaultValue = null,
  onChange,
  events = [],
  showWeekNumbers = false,
}) {
  // selected date state (supports controlled or uncontrolled)
  const [internalSelected, setInternalSelected] = useState(
    defaultValue ?? new Date()
  );
  const selected = value ?? internalSelected;

  // visible month state
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selected ?? new Date())
  );

  const eventsMap = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      map.set(e.date, e);
    });
    return map;
  }, [events]);

  const firstDay = startOfMonth(visibleMonth);
  const lastDay = endOfMonth(visibleMonth);

  // compute first day index in grid (0=Sun..6=Sat)
  const startIndex = firstDay.getDay();

  // number of days in month
  const daysInMonth = lastDay.getDate();

  // build array of day objects to render (6 rows x 7 cols = 42 cells)
  const cells = [];
  // days from previous month
  const prevMonthLastDate = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    0
  ).getDate();
  for (let i = startIndex - 1; i >= 0; i--) {
    const date = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() - 1,
      prevMonthLastDate - i
    );
    cells.push({ date, currentMonth: false });
  }
  // current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      d
    );
    cells.push({ date, currentMonth: true });
  }
  // next month
  const totalSlots = startIndex + daysInMonth;
  const weeks = Math.ceil(totalSlots / 7);
  const totalCells = weeks * 7;
  const remaining = totalCells - cells.length;

  for (let i = 1; i <= remaining; i++) {
    const date = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      i
    );
    cells.push({ date, currentMonth: false });
  }

  function selectDate(currentMonth, date) {
    if (!currentMonth) return;
    if (!value) setInternalSelected(date);
    if (onChange) onChange(date);
  }

  function goPrev() {
    setVisibleMonth((m) => addMonths(m, -1));
  }
  function goNext() {
    setVisibleMonth((m) => addMonths(m, 1));
  }

  return (
    <div className="w-full bg p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-gray-4c">
          <div className="text-base">
            {visibleMonth.toLocaleString(undefined, { month: "long" })}
          </div>
          <div className="font-medium text-base">
            {visibleMonth.getFullYear()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={goPrev}
            className="p-3 px-3 cursor-pointer rounded-full transition-all ease-in-out duration-300 hover:text-white hover:bg-accent focus:outline-none "
          >
            <BiChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={goNext}
            className="p-3 px-3 cursor-pointer rounded-full transition-all ease-in-out duration-300 hover:text-white hover:bg-accent focus:outline-none "
          >
            <BiChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday headings */}
      <div className="grid grid-cols-7 gap-3 text-sm text-center text-gray-4c mb-2">
        {WEEKDAY_SHORT.map((wd) => (
          <div key={wd} className="py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-3 gap-y-1">
        {cells.map((cell, idx) => {
          const { date, currentMonth } = cell;
          const iso = formatISODate(date);
          const isSelected = selected && areSameDay(selected, date);
          const isToday = areSameDay(date, new Date());
          const event = eventsMap.get(iso);

          return (
            <button
              key={idx}
              onClick={() => selectDate(currentMonth, date)}
              className={`aspect-square  text-center flex flex-col items-start rounded-full focus:outline-none transition-colors ease-in-out duration-150
                ${currentMonth ? "" : "opacity-40"}
                ${
                  isSelected
                    ? "bg-accent text-white font-medium"
                    : "font-light hover:bg-gray-200"
                }`}
              aria-pressed={isSelected}
            >
              <div className="w-full flex h-full items-center justify-center cursor-pointer">
                <div className="text-sm">{date.getDate()}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer with quick actions */}
      {/* <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <div>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setVisibleMonth(startOfMonth(today));
              selectDate(today);
            }}
            className="px-3 py-1 rounded-md hover:bg-gray-100"
          >
            Today
          </button>
        </div>

        <div className="text-xs">
          {selected ? selected.toDateString() : "No date selected"}
        </div>
      </div> */}
    </div>
  );
}
