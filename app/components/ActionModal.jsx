"use client";

import Modal from "./Modal";

export default function ActionModal({
  content,
  primaryBtnText,
  secBtnText,
  primaryAction,
  secAction,
  isOpen,
}) {
  const buttons = [
    {
      text: secBtnText || "Cancel",
      action: () => secAction && secAction(),
      className: "bg-surface-elevated text-zinc-300 hover:bg-surface-hover",
    },
    {
      text: primaryBtnText || "Confirm",
      action: () => primaryAction && primaryAction(),
      className: "bg-zinc-100 text-zinc-950 hover:bg-white",
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={secAction} maxWidth="max-w-md">
      <div className="text-base text-zinc-200 font-normal">
        {content || "Are you sure?"}
      </div>
      <div className="flex gap-2 items-center justify-end pt-1">
        {buttons.map((btn, i) => (
          <button
            type="button"
            key={btn.text + i}
            className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all active:scale-[0.97] ${btn.className}`}
            onClick={btn.action}
          >
            {btn.text}
          </button>
        ))}
      </div>
    </Modal>
  );
}
