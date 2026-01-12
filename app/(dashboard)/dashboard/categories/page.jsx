"use client";

import { BiPlus, BiSearch, BiTrash } from "react-icons/bi";
import RenderIcon from "@/app/components/RenderIcon";
import AddCategoryPane from "@/app/(dashboard)/components/AddCategoryPane";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { useCategories } from "@/app/supabase/categories";
import LoadingAnim from "@/app/components/LoadingAnim";

export default function Page() {
  const { open } = useRhsSidebarStore();
  const { categories, refresh, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <LoadingAnim />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 w-full h-[88vh]">
        {/* Col 1 */}
        <div className="bg-white rounded-lg h-full p-6 flex flex-col gap-4 w-7/12">
          <div className="w-full flex items-center gap-4">
            <div className="grow bg-gray-100 flex items-center rounded-md p-3 px-4 gap-2">
              <BiSearch className="text-zinc-500" />
              <input type="text" placeholder="Search by name..." />
            </div>
            <button
              className="bg-accent text-white flex items-center gap-2 p-2.5 rounded-md cursor-pointer"
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
                  className="flex justify-between gap-4 p-3 rounded-md cursor-pointer transition-all ease-in-out duration-300 hover:bg-gray-100"
                >
                  <div className="flex items-end-safe gap-4">
                    <RenderIcon
                      icon={cat.icon}
                      props={{ className: "text-2xl" }}
                    />
                    <span className="text-base">{cat.name}</span>
                  </div>
                  <button className="cursor-pointer focus:outline-none">
                    <BiTrash className="text-lg" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2 */}
        <div className="bg-white rounded-lg h-full w-5/12 p-6">
          <h2 className="text-accent text-2xl">Charts </h2>
        </div>
      </div>
    </div>
  );
}
