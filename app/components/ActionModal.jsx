export default function ActionModal({
  content,
  primaryBtnText,
  secBtnText,
  primaryAction,
  secAction,
  isOpen,
}) {
  const secondaryAction = () => {
    secAction && secAction();
  };

  const primaryBtnAction = () => {
    primaryAction && primaryAction();
  };

  const buttons = [
    {
      text: secBtnText || "Cancel",
      action: secondaryAction,
      class: "bg-zinc-100",
    },
    {
      text: primaryBtnText || "Done",
      action: primaryBtnAction,
      class: "bg-accent text-white",
    },
  ];

  return (
    <div
      className={`fixed z-50 inset-0 flex items-center justify-center bg-black/30 transition-all ease-in-out duration-300 ${
        isOpen ? "visible" : "pointer-events-none opacity-0 invisible"
      }`}
    >
      <div className="flex flex-col gap-4 bg-white p-6 px-8 rounded-lg w-lg">
        <div className="text-lg">{content || "Are you sure?"}</div>
        <div className="actions flex gap-2 items-center justify-end">
          {buttons.map((btn, i) => {
            return (
              <button
                key={btn + i}
                className={`px-4 py-2 rounded-md cursor-pointer ${btn.class}`}
                onClick={btn.action}
              >
                {btn.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
