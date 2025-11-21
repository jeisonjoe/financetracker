"use client";

import IconPicker from "@/app/components/IconPicker";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { useCategories } from "@/app/supabase/categories";
import { supabase } from "@/app/supabase/supabase-client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AddCategoryPane() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const { isOpen, close: closeRhs, setProps } = useRhsSidebarStore();
  const { user } = useAuth();
  const { refresh } = useCategories();

  const handleSubmitData = async () => {
    setIsLoading(true);

    if (!user) {
      return;
    }
    if (!name || !icon) {
      toast.error("Please provide all the required information");
      return;
    }
    const record = {
      user_id: user.id,
      name,
      icon,
    };
    const { error } = await supabase.from("categories").insert(record).single();
    if (error) {
      toast.error(error.message);
    }
    toast.success(`Created category : ${name}`);
    setName("");
    setIcon("");
    closeRhs();
    setIsLoading(false);
    refresh();
  };

  const handleClose = () => {
    if (isLoading) return;
    closeRhs();
  };

  useEffect(() => {
    setProps({ title: "New Category", onclose: handleClose });
  }, [isOpen]);

  return (
    <>
      {/* form */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-6 bg-app-bg py-3.5 rounded-lg">
          <input
            type="text"
            className="grow text-base focus:outline-none"
            placeholder="What is this for?"
            autoCorrect="off"
            autoCapitalize="on"
            spellCheck="false"
            value={name || ""}
            onInput={(e) => setName(e.target.value)}
          />
        </div>

        <IconPicker selected={icon} onSelect={(icon) => setIcon(icon)} />
      </div>

      <div className="flex gap-3">
        <button
          className="w-1/2 py-4 bg-gray-ef text-gray-4c rounded-lg cursor-pointer"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          className="w-1/2 py-4 bg-accent text-white rounded-lg cursor-pointer"
          onClick={handleSubmitData}
          disabled={isLoading}
        >
          Add Category
        </button>
      </div>
    </>
  );
}
