"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Custom accessible range slider matching the FinTrack dark design system.
 * Supports pointer dragging, click-to-seek, and keyboard navigation.
 */
export default function Slider({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  fillClassName = "bg-ink-body",
  thumbClassName = "bg-cta",
  trackClassName = "",
  disabled = false,
  ariaLabel,
  ariaLabelledBy,
}) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const safeMin = Number(min) || 0;
  const safeMax = Number(max) > safeMin ? Number(max) : safeMin + 100;
  const safeStep = Number(step) > 0 ? Number(step) : 1;
  const clampedValue = Math.min(safeMax, Math.max(safeMin, Number(value) || 0));
  const percent = ((clampedValue - safeMin) / (safeMax - safeMin)) * 100;

  const commitValue = useCallback(
    (nextRaw) => {
      if (disabled || !onChange) return;
      const snapped =
        Math.round((nextRaw - safeMin) / safeStep) * safeStep + safeMin;
      const clamped = Math.min(safeMax, Math.max(safeMin, snapped));
      const decimals = String(safeStep).includes(".")
        ? String(safeStep).split(".")[1].length
        : 0;
      const rounded = Number(clamped.toFixed(decimals));
      if (rounded !== clampedValue) {
        onChange(rounded);
      }
    },
    [disabled, onChange, safeMin, safeMax, safeStep, clampedValue]
  );

  const valueFromClientX = useCallback(
    (clientX) => {
      const el = trackRef.current;
      if (!el) return clampedValue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return clampedValue;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return safeMin + ratio * (safeMax - safeMin);
    },
    [clampedValue, safeMin, safeMax]
  );

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    commitValue(valueFromClientX(e.clientX));
  };

  const handlePointerMove = (e) => {
    if (!isDragging || disabled) return;
    commitValue(valueFromClientX(e.clientX));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    const jump = safeStep * 10;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      commitValue(clampedValue + safeStep);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      commitValue(clampedValue - safeStep);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      commitValue(clampedValue + jump);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      commitValue(clampedValue - jump);
    } else if (e.key === "Home") {
      e.preventDefault();
      commitValue(safeMin);
    } else if (e.key === "End") {
      e.preventDefault();
      commitValue(safeMax);
    }
  };

  const motionClass = isDragging
    ? "transition-none"
    : "transition-[width,left,transform] duration-200 ease-out";

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-valuemin={safeMin}
      aria-valuemax={safeMax}
      aria-valuenow={clampedValue}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`group relative flex items-center h-6 w-full select-none touch-none focus:outline-none ${
        disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {/* Background track */}
      <div
        className={`relative w-full h-1.5 rounded-full bg-tint-hover overflow-hidden ${trackClassName}`}
      >
        {/* Active fill */}
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full ${fillClassName} ${motionClass}`}
        />
      </div>

      {/* Custom Thumb */}
      <div
        style={{ left: `calc(${percent}% - 8px)` }}
        className={`absolute w-4 h-4 rounded-full border-2 border-surface ${thumbClassName} ${motionClass} ${
          isDragging
            ? "scale-115 ring-4 ring-tint-active"
            : "group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-tint-active"
        }`}
      />
    </div>
  );
}

