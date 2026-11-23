"use client";

import { forwardRef, useId } from "react";
import { BiCheck, BiMinus } from "react-icons/bi";

/**
 * Custom Checkbox component aligned with the FinTrack design system.
 *
 * Supports controlled/uncontrolled state, indeterminate state, optional label & description,
 * full keyboard accessibility (Space to toggle, Tab to focus), and custom sizing.
 */
const Checkbox = forwardRef(function Checkbox(
  {
    checked = false,
    indeterminate = false,
    onChange,
    disabled = false,
    id: externalId,
    name,
    value,
    label,
    description,
    className = "",
    boxClassName = "",
    size = "md", // "sm" | "md" | "lg"
    ariaLabel,
    onClick,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = externalId || generatedId;

  // Sizing definitions
  const sizeStyles = {
    sm: {
      box: "w-3.5 h-3.5 rounded-[5px]",
      icon: "w-2.5 h-2.5",
      text: "text-xs",
      desc: "text-[11px]",
    },
    md: {
      box: "w-4 h-4 rounded-md",
      icon: "w-3 h-3",
      text: "text-xs sm:text-sm",
      desc: "text-[11px] sm:text-xs",
    },
    lg: {
      box: "w-5 h-5 rounded-lg",
      icon: "w-3.5 h-3.5",
      text: "text-sm",
      desc: "text-xs",
    },
  }[size] || {
    box: "w-4 h-4 rounded-md",
    icon: "w-3 h-3",
    text: "text-xs sm:text-sm",
    desc: "text-[11px] sm:text-xs",
  };

  const isChecked = Boolean(checked);
  const isIndeterminate = Boolean(indeterminate && !isChecked);

  const handleChange = (e) => {
    if (disabled) return;
    if (onChange) {
      onChange(e.target.checked, e);
    }
  };

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const checkboxBox = (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 border transition-all duration-150 select-none ${
        sizeStyles.box
      } ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-surface border-line-faint"
          : isChecked || isIndeterminate
          ? "bg-ink-primary border-ink-primary text-surface cursor-pointer shadow-xs"
          : "bg-surface-elevated/70 hover:bg-surface-elevated border-line-subtle hover:border-line-strong text-transparent cursor-pointer"
      } ${boxClassName}`}
    >
      {/* Hidden real input for accessibility & forms */}
      <input
        ref={ref}
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        onClick={handleClick}
        aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
        aria-checked={isIndeterminate ? "mixed" : isChecked}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-10"
        {...props}
      />

      {/* Check icon */}
      {isChecked && (
        <svg
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${sizeStyles.icon} stroke-current transition-transform duration-150 transform scale-100`}
        >
          <path
            d="M3 7.2L5.8 10L11 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Indeterminate dash icon */}
      {isIndeterminate && (
        <svg
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${sizeStyles.icon} stroke-current`}
        >
          <path
            d="M3.5 7H10.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );

  // If no label or description provided, return just the standalone checkbox box
  if (!label && !description) {
    return checkboxBox;
  }

  // Wrapped with label and description
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-start gap-2.5 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <div className="pt-0.5 shrink-0">{checkboxBox}</div>
      <div className="flex flex-col min-w-0">
        {label && (
          <span
            className={`${sizeStyles.text} font-medium text-ink-primary leading-tight`}
          >
            {label}
          </span>
        )}
        {description && (
          <span className={`${sizeStyles.desc} text-ink-muted leading-relaxed mt-0.5`}>
            {description}
          </span>
        )}
      </div>
    </label>
  );
});

export default Checkbox;
