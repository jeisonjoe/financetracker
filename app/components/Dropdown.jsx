"use client";

import { useEffect, useRef, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

export default function Dropdown({
  options = [],
  value = {},
  onChange,
  placeholder = "Select",
  classname = "",
  triggerClass = "",
  menuClass = "",
  icon = null,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedOption =
    typeof value === "string"
      ? options.find((opt) => opt.key === value || opt.name === value) ||
        (value ? { key: value, name: value } : null)
      : value?.name
      ? value
      : options.find((opt) => opt.key === value?.key) || null;

  function handleSelect(option) {
    setOpen(false);
    if (onChange) onChange(option);
  }

  return (
    <div ref={ref} className={`relative w-full ${classname}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={
          triggerClass ||
          `${
            open ? "bg-surface-hover border-white/[0.12]" : "bg-surface-elevated border-white/[0.06]"
          } w-full py-2.5 px-4 gap-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:bg-surface-hover`
        }
        onClick={() => setOpen((pre) => !pre)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <div className="flex-shrink-0 flex items-center">{icon}</div>}
          <span
            className={`truncate text-sm ${
              selectedOption?.name ? "text-zinc-100 font-medium" : "text-zinc-500"
            }`}
          >
            {selectedOption?.name || placeholder}
          </span>
        </div>
        <BiChevronDown
          size={18}
          className={`text-zinc-500 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-zinc-300" : ""
          }`}
        />
      </button>

      {open && options && (
        <div
          className={`absolute p-1.5 bg-surface-elevated border border-white/[0.08] w-full min-w-[160px] left-0 top-[calc(100%+6px)] flex flex-col gap-0.5 rounded-xl shadow-dropdown-sm z-50 max-h-60 overflow-y-auto scrollbar-minimal animate-modal-in ${menuClass}`}
        >
          {options.map((item, i) => {
            const isSelected =
              selectedOption &&
              item.key === selectedOption.key &&
              item.name === selectedOption.name;
            return (
              <button
                type="button"
                key={(item.key ?? item.name) + i}
                onClick={() => handleSelect(item)}
                className={`${
                  isSelected
                    ? "bg-white/[0.1] text-zinc-100 font-medium"
                    : "text-zinc-400"
                } text-left text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.05] hover:text-zinc-100 cursor-pointer`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
