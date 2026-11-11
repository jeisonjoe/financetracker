"use client";

import { useEffect, useRef, useState } from "react";
import { cFormat } from "@/app/utils/currencyFormat";

/**
 * Smoothly interpolates numeric currency values on change for tactile feedback.
 */
export default function AnimatedNumber({
  value = 0,
  currency = "INR",
  decimals = 0,
  duration = 420,
  prefix = "",
  className = "",
}) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);

  useEffect(() => {
    const startVal = currentRef.current;
    if (startVal === target) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }

    let rafId = null;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startVal + (target - startVal) * eased;
      currentRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {cFormat(display, { currency, decimals })}
    </span>
  );
}

