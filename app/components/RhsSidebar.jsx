import { useRef } from "react";
import { useRhsSidebarStore } from "../store/RhsSidebarStore";
import { BiX } from "react-icons/bi";

export default function RhsSidebar() {
  const { isOpen, component: Component, close, props } = useRhsSidebarStore();
  const { title, onclose } = props;
  const ref = useRef();

  const handleClose = () => {
    console.log(props);
    onclose && onclose();
    close();
  };

  return (
    <div
      className={
        `${
          isOpen
            ? "z-10 bg-black/10 inset-0 opacity-100 "
            : "inset-0 bg-transparent pointer-events-none opacity-0 "
        } ` +
        "w-full h-full z-10  fixed  transition-all duration-800 ease-in-out"
      }
      onMouseUp={(e) => {
        if (!ref.current.contains(e.target)) {
          close();
        }
      }}
    >
      <aside
        ref={ref}
        className={
          `${isOpen ? "right-0" : "right-[-100%]"} ` +
          "fixed z-20 right-0 top-0 h-screen w-lg bg-white p-8 py-6 flex flex-col justify-between transition-all ease-in-out duration-800"
        }
      >
        <div className="flex flex-col gap-8 grow overflow-y-auto no-scrollbar pb-4">
          <div className="flex items-center justify-between text-gray-3a">
            <span className="text-xl font-medium">{title && title}</span>
            <button
              className="p-3 rounded-full bg-nav-hover cursor-pointer"
              onClick={handleClose}
            >
              <BiX size={20} />
            </button>
          </div>

          {Component && <Component />}
        </div>
      </aside>
    </div>
  );
}
