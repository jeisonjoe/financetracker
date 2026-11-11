import React, { useState } from "react";
import { BiChevronLeft, BiChevronRight } from "react-icons/bi";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({ value, defaultValue = null, onChange }) {
  const [internalSelected, setInternalSelected] = useState(
    defaultValue ?? new Date()
  );
  const selected = value ?? internalSelected;

  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selected ?? new Date())
  );

  const firstDay = startOfMonth(visibleMonth);
  const lastDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  );

  const startIndex = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const cells = [];
  const prevMonthLastDate = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    0
  ).getDate();

  for (let i = startIndex - 1; i >= 0; i--) {
    cells.push({
      date: new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() - 1,
        prevMonthLastDate - i
      ),
      currentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), d),
      currentMonth: true,
    });
  }

  const totalSlots = startIndex + daysInMonth;
  const totalCells = Math.ceil(totalSlots / 7) * 7;
  const remaining = totalCells - cells.length;

  for (let i = 1; i <= remaining; i++) {
    cells.push({
      date: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, i),
      currentMonth: false,
    });
  }

  function selectDate(currentMonth, date) {
    if (!value) setInternalSelected(date);
    if (!currentMonth) setVisibleMonth(startOfMonth(date));
    if (onChange) onChange(date);
  }

  function goPrev() {
    setVisibleMonth((m) => addMonths(m, -1));
  }

  function goNext() {
    setVisibleMonth((m) => addMonths(m, 1));
  }

  function goToday() {
    const today = new Date();
    setVisibleMonth(startOfMonth(today));
    if (onChange) onChange(today);
  }

  return (
    <div className="w-full p-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={goPrev}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
        >
          <BiChevronLeft size={20} />
        </button>

        <span className="text-zinc-100 font-medium text-base capitalize">
          {visibleMonth.toLocaleString(undefined, { month: "long" })}{" "}
          {visibleMonth.getFullYear()}
        </span>

        <button
          type="button"
          onClick={goNext}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
        >
          <BiChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_SHORT.map((wd) => (
          <div
            key={wd}
            className="text-xs font-medium text-zinc-500 text-center py-1.5"
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const { date, currentMonth } = cell;
          const isSelected = selected && areSameDay(selected, date);
          const isToday = areSameDay(date, new Date());

          return (
            <button
              type="button"
              key={idx}
              onClick={() => selectDate(currentMonth, date)}
              className={`aspect-square rounded-full flex items-center justify-center text-sm transition-colors cursor-pointer ${
                !currentMonth ? "text-zinc-700" : "text-zinc-300 font-normal"
              } ${
                isSelected
                  ? "bg-zinc-100 text-zinc-950 font-medium"
                  : "hover:bg-white/[0.06]"
              } ${
                isToday && !isSelected
                  ? "ring-1 ring-white/25 text-zinc-100 font-medium"
                  : ""
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            setVisibleMonth(startOfMonth(yesterday));
            selectDate(true, yesterday);
          }}
          className="px-3 py-1.5 rounded-full hover:bg-white/[0.06] text-zinc-400 font-medium cursor-pointer transition-colors"
        >
          Yesterday
        </button>

        <button
          type="button"
          onClick={goToday}
          className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-zinc-100 font-medium cursor-pointer transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
}
