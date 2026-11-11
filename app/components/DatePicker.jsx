"use client";

import { useEffect, useRef, useState } from "react";
import { BiCalendar, BiX } from "react-icons/bi";
import Calendar from "./Calender";

function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const str = String(value).slice(0, 10);
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function toIsoDateString(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Reusable date picker wrapping the shared Calendar component in an animated popover.
 */
export default function DatePicker({
  value = "",
  onChange,
  placeholder = "Select date",
  clearable = false,
  align = "right",
  triggerClass = "",
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const parsedDate = parseLocalDate(value);
  const formattedLabel = parsedDate
    ? parsedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const handleSelect = (date) => {
    onChange?.(toIsoDateString(date));
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel || placeholder}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className={
          triggerClass ||
          `${
            open
              ? "bg-surface-hover border-white/[0.12]"
              : "bg-surface-elevated border-white/[0.06]"
          } w-full py-2.5 px-3.5 gap-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-surface-hover`
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          <BiCalendar size={16} className="text-zinc-500 shrink-0" />
          <span
            className={`truncate text-sm tabular-nums ${
              formattedLabel ? "text-zinc-100 font-medium" : "text-zinc-500"
            }`}
          >
            {formattedLabel || placeholder}
          </span>
        </div>

        {clearable && formattedLabel && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear date"
            className="p-0.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.08] cursor-pointer transition-colors shrink-0"
          >
            <BiX size={15} />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute top-[calc(100%+6px)] ${
            align === "left" ? "left-0" : "right-0"
          } w-72 p-2 bg-surface-elevated rounded-2xl shadow-dropdown-sm border border-white/[0.08] z-50 animate-modal-in`}
        >
          <Calendar
            value={parsedDate ?? new Date()}
            onChange={handleSelect}
          />
        </div>
      )}
    </div>
  );
}

