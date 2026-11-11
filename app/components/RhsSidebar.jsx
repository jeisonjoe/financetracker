"use client";

import { useRef } from "react";
import { useRhsSidebarStore } from "../store/RhsSidebarStore";
import { BiX } from "react-icons/bi";

export default function RhsSidebar() {
  const { isOpen, component: Component, close, props } = useRhsSidebarStore();
  const { title, onclose } = props;
  const ref = useRef();

  const handleClose = () => {
    onclose && onclose();
    close();
  };

  return (
    <div
      className={`${
        isOpen
          ? "z-40 bg-black/60 backdrop-blur-xs opacity-100"
          : "pointer-events-none opacity-0 -z-10"
      } fixed inset-0 w-full h-full transition-opacity duration-300 ease-in-out`}
      onMouseUp={(e) => {
        if (ref.current && !ref.current.contains(e.target)) {
          handleClose();
        }
      }}
    >
      <aside
        ref={ref}
        className={`${
          isOpen ? "translate-x-0" : "translate-x-full"
        } fixed z-50 right-0 top-0 h-screen w-full max-w-lg bg-surface p-6 sm:p-8 flex flex-col justify-between transition-transform ease-in-out duration-300 border-l border-white/[0.06]`}
      >
        <div className="flex flex-col gap-5 grow overflow-y-auto no-scrollbar pb-2">
          <div className="flex items-center justify-between text-zinc-100 pb-3 border-b border-white/[0.06]">
            <span className="text-xl font-normal">{title || ""}</span>
            <button
              type="button"
              className="p-2 rounded-full bg-surface-elevated hover:bg-surface-hover text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <BiX size={20} />
            </button>
          </div>

          {Component && <Component {...props} />}
        </div>
      </aside>
    </div>
  );
}
