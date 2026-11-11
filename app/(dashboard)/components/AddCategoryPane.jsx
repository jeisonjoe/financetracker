"use client";

import IconPicker from "@/app/components/IconPicker";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { useCategoryMutations } from "@/app/hooks/useFinanceData";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AddCategoryPane({ category: editCategory = null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(editCategory?.name || "");
  const [type, setType] = useState(editCategory?.type || "expense");
  const [monthlyBudget, setMonthlyBudget] = useState(
    editCategory?.monthly_budget ? String(editCategory.monthly_budget) : ""
  );
  const [icon, setIcon] = useState(editCategory?.icon || null);

  const { isOpen, close: closeRhs, setProps } = useRhsSidebarStore();
  const { user } = useAuth();
  const { createCategory, updateCategory } = useCategoryMutations();

  const handleClose = () => {
    if (isLoading) return;
    closeRhs();
  };

  useEffect(() => {
    setProps({
      title: editCategory ? "Edit Category" : "New Category",
      onclose: handleClose,
    });
  }, [isOpen, editCategory]);

  const handleSubmitData = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        icon,
        monthly_budget: Number(monthlyBudget) || 0,
      };

      if (editCategory) {
        await updateCategory.mutateAsync({ id: editCategory.id, payload });
        toast.success(`Updated category: ${name}`);
      } else {
        await createCategory.mutateAsync(payload);
        toast.success(`Created category: ${name}`);
      }
      closeRhs();
    } catch (error) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">Name</label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-surface-elevated border border-line-subtle rounded-xl text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none focus:border-line-focus"
            placeholder="e.g. Dining Out"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">Type</label>
          <div className="flex bg-surface-elevated border border-line-subtle p-1 rounded-full self-start">
            {["expense", "income", "both"].map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => setType(opt)}
                className={`px-4 py-1.5 rounded-full text-xs font-normal capitalize cursor-pointer transition-colors ${
                  type === opt ? "bg-cta text-cta-ink" : "text-ink-subtle hover:text-ink-secondary"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">
            Monthly Budget Limit (optional)
          </label>
          <input
            type="number"
            inputMode="decimal"
            className="w-full px-4 py-3 bg-surface-elevated border border-line-subtle rounded-xl text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none focus:border-line-focus"
            placeholder="0 for no limit"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">Icon</label>
          <IconPicker selected={icon} onSelect={setIcon} />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-line-subtle">
        <button
          type="button"
          className="flex-1 py-3 bg-surface-elevated text-ink-body font-normal rounded-full cursor-pointer hover:bg-surface-hover transition-colors"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex-1 py-3 bg-cta hover:bg-cta-hover text-cta-ink font-medium rounded-full cursor-pointer transition-colors disabled:opacity-60"
          onClick={handleSubmitData}
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : editCategory
            ? "Save Changes"
            : "Add Category"}
        </button>
      </div>
    </div>
  );
}
