"use client";

import Dropdown from "@/app/components/Dropdown";

export const PERIOD_OPTIONS = [
  { key: "this_month", name: "This Month" },
  { key: "last_month", name: "Last Month" },
  { key: "last_3_months", name: "Last 3 Months" },
  { key: "all_time", name: "All Time" },
];

export default function PeriodSelector({ value = "this_month", onChange }) {
  const selected =
    PERIOD_OPTIONS.find((opt) => opt.key === value) || PERIOD_OPTIONS[0];

  return (
    <div className="w-36 sm:w-40">
      <Dropdown
        options={PERIOD_OPTIONS}
        value={selected}
        onChange={(opt) => onChange && onChange(opt.key)}
        triggerClass="w-full flex items-center justify-between gap-2 text-ink-body bg-surface-elevated border border-line-subtle px-3.5 py-2 rounded-full text-xs sm:text-sm font-normal hover:bg-surface-hover transition-colors cursor-pointer"
      />
    </div>
  );
}
