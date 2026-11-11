"use client";

/**
 * Minimal animated SVG progress ring for goal and allocation completion.
 */
export default function ProgressRing({
  percent = 0,
  size = 48,
  strokeWidth = 3.5,
  colorClass = "text-ink-secondary",
  label,
}) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-tint-hover"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colorClass} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <span className="absolute text-[11px] font-medium text-ink-secondary tabular-nums">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}

