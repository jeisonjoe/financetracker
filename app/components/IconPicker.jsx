"use client";
import * as BiIcons from "react-icons/bi";
import * as FcIcons from "react-icons/fc";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

const ALL_ICONS = [
  ...Object.entries(FcIcons).map(([name, Icon]) => ({ name, Icon })),
  ...Object.entries(BiIcons).map(([name, Icon]) => ({ name, Icon })),
];

const IconPicker = memo(function IconPicker({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, startTransition] = useTransition();
  const [value, setValue] = useState(selected || null);

  const iconsRef = useRef();

  const handleSelectValue = (icon) => {
    setValue(icon);
    onSelect && onSelect({ name: icon.name });
    setOpen(false);
  };

  const icons = useMemo(() => {
    if (!query) return ALL_ICONS.slice(0, 120);
    return ALL_ICONS.filter(({ name }) =>
      name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 120);
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (iconsRef.current && !iconsRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const SelectedIcon =
    value?.Icon ||
    (value?.name ? FcIcons[value.name] || BiIcons[value.name] : null);

  return (
    <div className="relative w-fit" ref={iconsRef}>
      <button
        type="button"
        className="p-2.5 px-3.5 bg-surface-elevated hover:bg-surface-hover border border-line-subtle rounded-xl cursor-pointer transition-colors flex items-center gap-2 text-sm text-ink-body"
        onClick={() => setOpen((p) => !p)}
      >
        {SelectedIcon ? (
          <SelectedIcon size={20} className="text-ink-primary" />
        ) : (
          <BiIcons.BiSmile size={20} className="text-ink-subtle" />
        )}
        <span>{value?.name ? "Change icon" : "Pick icon"}</span>
      </button>

      {open && (
        <div className="absolute bg-surface-elevated rounded-2xl p-3 z-40 shadow-dropdown-sm border border-line top-[115%] left-0 w-72 h-72">
          <div className="flex flex-col gap-3 h-full overflow-hidden">
            <div className="flex items-center gap-2">
              <input
                onChange={(e) => {
                  const val = e.target.value;
                  setSearch(val);
                  startTransition(() => {
                    setQuery(val);
                  });
                }}
                value={search}
                placeholder="Search icons..."
                type="text"
                className="bg-surface text-ink-primary placeholder:text-ink-placeholder grow text-sm p-2 px-3 rounded-lg border border-line-subtle focus:outline-none"
              />
              <button
                type="button"
                className="bg-surface hover:bg-tint-hover text-ink-muted p-2 rounded-lg cursor-pointer"
                onClick={() => {
                  setValue(null);
                  onSelect && onSelect(null);
                }}
                title="Clear icon"
              >
                <BiIcons.BiTrash size={16} />
              </button>
            </div>
            {isLoading ? (
              <div className="grow flex items-center justify-center text-sm text-ink-subtle">
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1.5 overflow-auto no-scrollbar">
                {icons.map((icon, i) => (
                  <button
                    type="button"
                    key={icon.name + i}
                    className="text-ink-body w-full h-fit flex justify-center p-2 rounded-lg transition-colors hover:bg-tint-hover cursor-pointer"
                    onClick={() => handleSelectValue(icon)}
                  >
                    <icon.Icon size={22} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default IconPicker;
