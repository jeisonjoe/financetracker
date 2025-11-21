"use client";
import * as BiIcons from "react-icons/bi";
import * as FcIcons from "react-icons/fc";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

const ALL_ICONS = [
  ...Object.entries(FcIcons).map(([name, Icon]) => ({ name, Icon })),
  ...Object.entries(BiIcons).map(([name, Icon]) => ({ name, Icon })),
];

export default function IconPicker({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, startTransition] = useTransition();
  const [value, setValue] = useState(null);

  const iconsRef = useRef();

  const handleOverlayToggle = () => {
    setOpen((p) => !p);
  };

  const handleSelectValue = (icon) => {
    setValue(icon);
    console.log(icon);
    onSelect && onSelect(icon);
    setOpen(false);
  };

  const icons = useMemo(() => {
    if (!query) return ALL_ICONS;
    return ALL_ICONS.filter(({ name }) =>
      name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (iconsRef.current && !iconsRef?.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className="relative w-fit" ref={iconsRef}>
      {/* Trigger */}
      <button
        className="p-1.5 bg-gray-100  rounded-md cursor-pointer shadow-sm"
        onClick={handleOverlayToggle}
      >
        {value ? (
          <value.Icon size={26} className="text-gray-700" />
        ) : (
          <BiIcons.BiSmile size={24} className="text-gray-400" />
        )}
      </button>

      <div
        ref={iconsRef}
        className={
          "absolute bg-gray-100 rounded-md p-3 z-40 shadow-dropdown-sm border border-zinc-200 top-[120%] left-0 w-[20rem] h-[19rem] transition-all duration-200 ease-in-out" +
          ` ${open ? "opacity-100 " : "opacity-0 pointer-events-none"}`
        }
      >
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          <div className="flex items-center gap-2">
            <input
              onInput={(e) => {
                const val = e.target.value;
                setSearch(val);
                startTransition(() => {
                  setQuery(val);
                });
              }}
              value={search}
              type="text"
              className="bg-gray-200/70 text-zinc-600  grow text-sm p-2 px-3 rounded-md focus:outline-none"
            />
            <button
              className="bg-gray-200 text-zinc-600 p-2 rounded-md cursor-pointer"
              onClick={() => setValue(null)}
            >
              <BiIcons.BiTrash size={18} />
            </button>
          </div>
          {isLoading ? (
            <div className="grow flex items-center justify-center">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 overflow-auto no-scrollbar">
              {icons &&
                icons?.map((icon, i) => {
                  return (
                    <div
                      key={icon.name + i}
                      className="text-zinc-600 w-full h-fit flex justify-center p-2 rounded-lg transition-colors duration-300 ease-in-out hover:bg-zinc-200/70 cursor-pointer"
                      onClick={() => handleSelectValue(icon)}
                    >
                      <icon.Icon size={26} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
