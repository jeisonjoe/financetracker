"use client";

import { useMemo, useState } from "react";
import { BiCalendar, BiCalendarEvent } from "react-icons/bi";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";

export const PERIOD_OPTIONS = [
  { key: "this_month", name: "This Month" },
  { key: "salary_cycle", name: "Salary Cycle" },
  { key: "last_month", name: "Last Month" },
  { key: "last_3_months", name: "Last 3 Months" },
  { key: "all_time", name: "All Time" },
  { key: "custom", name: "Custom Range..." },
];

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PeriodSelector({ value = "this_month", onChange }) {
  const isCustom = typeof value === "string" && value.startsWith("custom:");
  const [modalOpen, setModalOpen] = useState(false);

  const parsedCustomDates = useMemo(() => {
    if (!isCustom) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      return { start: startOfMonth, end: todayStr };
    }
    const [start, end] = value.replace("custom:", "").split("_");
    return {
      start: start || new Date().toISOString().slice(0, 10),
      end: end || new Date().toISOString().slice(0, 10),
    };
  }, [value, isCustom]);

  const [startDate, setStartDate] = useState(parsedCustomDates.start);
  const [endDate, setEndDate] = useState(parsedCustomDates.end);

  const selected = useMemo(() => {
    if (isCustom) {
      const [start, end] = value.replace("custom:", "").split("_");
      return {
        key: value,
        name: `${formatDateLabel(start)} – ${formatDateLabel(end)}`,
      };
    }
    return PERIOD_OPTIONS.find((opt) => opt.key === value) || PERIOD_OPTIONS[0];
  }, [value, isCustom]);

  const dropdownOptions = useMemo(() => {
    if (isCustom) {
      return [selected, ...PERIOD_OPTIONS];
    }
    return PERIOD_OPTIONS;
  }, [isCustom, selected]);

  const handleDropdownSelect = (opt) => {
    if (opt.key === "custom" || opt.key === selected.key && isCustom) {
      setStartDate(parsedCustomDates.start);
      setEndDate(parsedCustomDates.end);
      setModalOpen(true);
      return;
    }
    onChange?.(opt.key);
  };

  const applyPreset = (daysBack) => {
    const end = new Date();
    const start = new Date();
    if (daysBack === "this_month") {
      start.setDate(1);
    } else if (daysBack === "this_year") {
      start.setMonth(0, 1);
    } else {
      start.setDate(end.getDate() - daysBack);
    }
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    const finalStart = startDate <= endDate ? startDate : endDate;
    const finalEnd = startDate <= endDate ? endDate : startDate;
    onChange?.(`custom:${finalStart}_${finalEnd}`);
    setModalOpen(false);
  };

  return (
    <>
      <div className={isCustom ? "w-44 sm:w-48" : "w-36 sm:w-40"}>
        <Dropdown
          options={dropdownOptions}
          value={selected}
          onChange={handleDropdownSelect}
          triggerClass="w-full flex items-center justify-between gap-2 text-ink-body bg-surface-elevated border border-line-subtle px-3.5 py-2 rounded-full text-xs sm:text-sm font-normal hover:bg-surface-hover transition-colors cursor-pointer"
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Custom Date Range"
        subtitle="Select start and end dates to filter transactions and analytics."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleApplyCustom} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <span className="text-[11px] text-ink-subtle mr-1">Presets:</span>
            {[
              { label: "Last 7 Days", days: 7 },
              { label: "Last 30 Days", days: 30 },
              { label: "This Month", days: "this_month" },
              { label: "This Year", days: "this_year" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="px-2.5 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-hover border border-line-subtle text-ink-secondary transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="bg-surface-elevated border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink-primary focus:outline-none focus:border-line-focus cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="bg-surface-elevated border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-ink-primary focus:outline-none focus:border-line-focus cursor-pointer"
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className="p-3 bg-surface-elevated/60 rounded-xl border border-line-subtle text-xs text-ink-subtle flex items-center gap-2">
              <BiCalendarEvent size={16} className="text-accent shrink-0" />
              <span>
                Filtering period:{" "}
                <span className="font-medium text-ink-primary">
                  {formatDateLabel(startDate)} – {formatDateLabel(endDate)}
                </span>
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Apply Range
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
