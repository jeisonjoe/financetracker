"use client";

import { useEffect } from "react";
import { BiX } from "react-icons/bi";

/**
 * Reusable accessible modal shell with backdrop fade, scale-in transition,
 * and Escape-key dismissal matching the workspace dark surface design.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "max-w-md",
  children,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed z-50 inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-backdrop-in"
      onClick={() => onClose?.()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col gap-4 bg-surface p-6 rounded-2xl w-full ${maxWidth} border border-white/[0.08] animate-modal-in`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3">
            <div>
              {title && (
                <h3 className="text-lg font-normal text-zinc-100">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-full bg-surface-elevated hover:bg-surface-hover text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors"
              >
                <BiX size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

