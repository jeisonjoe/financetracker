"use client";

import { BiPlus, BiSearch, BiTrash } from "react-icons/bi";
import RenderIcon from "@/app/components/RenderIcon";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";

export default function CategoryPage({ categories }) {
  const { open } = useRhsSidebarStore();

  if (!categories.length) {
    return <div className="">No categories found</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 w-full h-[88vh]">
        {/* Col 1 */}
        <div className="bg-surface-elevated/50 border border-white/[0.06] rounded-2xl h-full p-6 flex flex-col gap-4 w-7/12 text-zinc-200">
          <div className="w-full flex items-center gap-4">
            <div className="grow bg-white/[0.04] border border-white/[0.06] flex items-center rounded-xl p-3 px-4 gap-2">
              <BiSearch className="text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name..."
                className="bg-transparent w-full text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <button
              className="bg-zinc-100 hover:bg-white text-zinc-950 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium cursor-pointer transition-colors"
              onClick={() => open(AddCategoryPane)}
            >
              <BiPlus />
              New Category
            </button>
          </div>

          <div className="flex flex-col">
            {categories?.map((cat) => {
              return (
                <div
                  key={cat.id}
                  className="flex justify-between gap-4 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-end-safe gap-4">
                    <RenderIcon
                      icon={cat.icon}
                      props={{ className: "text-2xl text-zinc-400" }}
                    />
                    <span className="text-base text-zinc-200">{cat.name}</span>
                  </div>
                  <button className="cursor-pointer text-zinc-500 hover:text-red-400 focus:outline-none transition-colors">
                    <BiTrash className="text-lg" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2 */}
        <div className="bg-surface-elevated/50 border border-white/[0.06] rounded-2xl h-full w-5/12 p-6">
          <h2 className="text-zinc-200 text-xl font-medium">Charts</h2>
        </div>
      </div>
    </div>
  );
}
