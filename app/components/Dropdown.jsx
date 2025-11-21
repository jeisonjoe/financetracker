"use client";

import { useEffect, useRef, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

export default function Dropdown({
  options = [],
  value = {},
  onChange,
  placeholder = "Select",
  classname = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    function handleclickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleclickOutside);
    return () => document.removeEventListener("click", handleclickOutside);
  }, []);

  function handleSelect(option) {
    setOpen(false);
    if (onChange) onChange(option);
  }

  return (
    <div ref={ref} className={`relative min-w-sm w-full  ${classname}`}>
      {/* Trigger */}
      <button
        className={`${open ? "bg-slate-100 " : "bg-app-bg "}
          min-w-sm w-full  py-3.5 gap-2 rounded-lg flex items-center justify-between px-6 cursor-pointer`}
        onClick={() => setOpen((pre) => !pre)}
      >
        <span
          className={`${
            value?.name ? "text-amount-primary " : "text-sec-96 "
          } `}
        >
          {value?.name || placeholder}
        </span>
        <BiChevronDown size={18} stroke="1" className="text-gray-46" />
      </button>

      {/* DropdownItems */}
      {open && options && (
        <div className="absolute  p-3 bg-white w-[99%] left-[50%] top-[110%] translate-x-[-50%] flex flex-col gap-2 rounded-lg shadow-dropdown-sm z-50">
          {options.map((item, i) => {
            return (
              <div
                key={item.key + i}
                onClick={() => handleSelect(item)}
                className={`${
                  item.key == value?.key ? "bg-gray-100" : ""
                } text-gray-4c p-2 px-3 rounded-md transition-colors duration-300 ease-in-out hover:bg-gray-100 cursor-pointer`}
              >
                {item.name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
