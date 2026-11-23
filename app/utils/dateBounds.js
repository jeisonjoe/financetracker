/**
 * Utilities for parsing and calculating date bounds from period identifiers.
 */

export function toIsoDate(d) {
  if (!d || Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseLocalDate(value) {
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

export function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns { startDate, endDate, label, isCustom } for any period string.
 * startDate and endDate are in 'YYYY-MM-DD' format (or null for 'all_time').
 */
export function getPeriodDateBounds(period = "this_month") {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (typeof period === "string" && period.startsWith("custom:")) {
    const rangeStr = period.slice(7);
    const [startPart, endPart] = rangeStr.split("_");
    const s = startPart || toIsoDate(now);
    const e = endPart || s;

    let label = "";
    if (s === e) {
      label = formatDateLabel(s);
    } else {
      label = `${formatShortDate(s)} – ${formatDateLabel(e)}`;
    }

    return {
      startDate: s,
      endDate: e,
      label,
      isCustom: true,
    };
  }

  if (period === "today") {
    const todayStr = toIsoDate(now);
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: "Today",
      isCustom: false,
    };
  }

  if (period === "yesterday") {
    const yDate = new Date(year, month, now.getDate() - 1);
    const yStr = toIsoDate(yDate);
    return {
      startDate: yStr,
      endDate: yStr,
      label: "Yesterday",
      isCustom: false,
    };
  }

  if (period === "this_week") {
    const day = now.getDay(); // 0 is Sunday
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(year, month, now.getDate() - diffToMonday);
    const end = new Date(year, month, now.getDate() + (6 - diffToMonday));
    return {
      startDate: toIsoDate(monday),
      endDate: toIsoDate(end),
      label: "This Week",
      isCustom: false,
    };
  }

  if (period === "last_7_days") {
    const start = new Date(year, month, now.getDate() - 6);
    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(now),
      label: "Last 7 Days",
      isCustom: false,
    };
  }

  if (period === "last_30_days") {
    const start = new Date(year, month, now.getDate() - 29);
    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(now),
      label: "Last 30 Days",
      isCustom: false,
    };
  }

  if (period === "last_month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
      label: "Last Month",
      isCustom: false,
    };
  }

  if (period === "last_3_months") {
    const start = new Date(year, month - 2, 1);
    const end = new Date(year, month + 1, 0);
    return {
      startDate: toIsoDate(start),
      endDate: toIsoDate(end),
      label: "Last 3 Months",
      isCustom: false,
    };
  }

  if (period === "all_time") {
    return {
      startDate: null,
      endDate: null,
      label: "All Time",
      isCustom: false,
    };
  }

  if (period === "salary_cycle") {
    return {
      startDate: null,
      endDate: null,
      label: "Salary Cycle",
      isCustom: false,
    };
  }

  // Default: this_month
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
    label: "This Month",
    isCustom: false,
  };
}
