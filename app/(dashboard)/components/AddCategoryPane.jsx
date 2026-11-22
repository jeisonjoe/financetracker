"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import IconPicker from "@/app/components/IconPicker";
import Dropdown from "@/app/components/Dropdown";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { useCategoriesQuery, useCategoryMutations } from "@/app/hooks/useFinanceData";

export default function AddCategoryPane({
  category: editCategory = null,
  defaultParentId = null,
  isSubcategory: initialIsSubcategory = false,
}) {
  const { data: allCategories = [] } = useCategoriesQuery();
  const parentCategories = useMemo(
    () => allCategories.filter((c) => !c.parent_id && !c.parentId),
    [allCategories]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSubcategory, setIsSubcategory] = useState(
    Boolean(editCategory?.parent_id || editCategory?.parentId || defaultParentId || initialIsSubcategory)
  );
  const [parentId, setParentId] = useState(
    editCategory?.parent_id || editCategory?.parentId || defaultParentId || (parentCategories[0]?.id || "")
  );

  const [name, setName] = useState(editCategory?.name || "");
  const [type, setType] = useState(editCategory?.type || "expense");
  const [monthlyBudget, setMonthlyBudget] = useState(
    editCategory?.monthly_budget ? String(editCategory.monthly_budget) : ""
  );
  const [icon, setIcon] = useState(editCategory?.icon || null);
  const [color, setColor] = useState(
    editCategory?.color || editCategory?.icon?.color || "#3b82f6"
  );
  const [rollover, setRollover] = useState(
    Boolean(editCategory?.rollover || editCategory?.icon?.rollover)
  );

  const COLOR_PALETTE = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#64748b",
    "#0284c7",
  ];

  const { isOpen, close: closeRhs, setProps } = useRhsSidebarStore();
  const { user } = useAuth();
  const { createCategory, updateCategory } = useCategoryMutations();

  const handleClose = () => {
    if (isLoading) return;
    closeRhs();
  };

  useEffect(() => {
    const title = editCategory
      ? isSubcategory
        ? "Edit Subcategory"
        : "Edit Category"
      : isSubcategory
      ? "New Subcategory"
      : "New Category";

    setProps({
      title,
      onclose: handleClose,
    });
  }, [isOpen, editCategory, isSubcategory]);

  // Keep type in sync with selected parent when subcategory is active
  const selectedParent = useMemo(
    () => parentCategories.find((p) => String(p.id) === String(parentId)) || parentCategories[0],
    [parentCategories, parentId]
  );

  const handleSubmitData = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (isSubcategory && !parentId) {
      toast.error("Please select a parent category");
      return;
    }

    setIsLoading(true);
    try {
      const iconPayload = isSubcategory
        ? selectedParent?.icon || icon
        : {
            ...(typeof icon === "object" && icon !== null ? icon : {}),
            color,
            rollover,
          };

      const payload = {
        name: name.trim(),
        parent_id: isSubcategory ? String(parentId) : null,
        type: isSubcategory ? (selectedParent?.type || "expense") : type,
        icon: iconPayload,
        monthly_budget: Number(monthlyBudget) || 0,
      };

      if (editCategory) {
        await updateCategory.mutateAsync({ id: editCategory.id, payload });
        toast.success(`Updated ${isSubcategory ? "subcategory" : "category"}: ${name}`);
      } else {
        await createCategory.mutateAsync(payload);
        toast.success(`Created ${isSubcategory ? "subcategory" : "category"}: ${name}`);
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
        {/* Category vs Subcategory Toggle */}
        {!editCategory && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-normal text-ink-subtle pl-1">Level</label>
            <div className="flex bg-surface-elevated border border-line-subtle p-1 rounded-full self-start">
              <button
                type="button"
                onClick={() => setIsSubcategory(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-normal cursor-pointer transition-colors ${
                  !isSubcategory ? "bg-cta text-cta-ink font-medium" : "text-ink-subtle hover:text-ink-secondary"
                }`}
              >
                Top-Level Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSubcategory(true);
                  if (!parentId && parentCategories.length > 0) {
                    setParentId(parentCategories[0].id);
                  }
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-normal cursor-pointer transition-colors ${
                  isSubcategory ? "bg-cta text-cta-ink font-medium" : "text-ink-subtle hover:text-ink-secondary"
                }`}
              >
                Subcategory
              </button>
            </div>
          </div>
        )}

        {/* Parent Category Selector (If Subcategory) */}
        {isSubcategory && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-normal text-ink-subtle pl-1">
              Parent Category
            </label>
            <Dropdown
              options={parentCategories.map((p) => ({
                key: String(p.id),
                name: p.name,
              }))}
              value={
                selectedParent
                  ? { key: String(selectedParent.id), name: selectedParent.name }
                  : { key: "", name: "Select Parent Category" }
              }
              onChange={(opt) => setParentId(opt.key)}
              placeholder="Select Parent Category"
            />
          </div>
        )}

        {/* Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">
            {isSubcategory ? "Subcategory Name" : "Category Name"}
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-surface-elevated border border-line-subtle rounded-xl text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none focus:border-line-focus"
            placeholder={
              isSubcategory
                ? "e.g. Breakfast, Petrol, Electricity, Train"
                : "e.g. Food & Dining, Travel, Bills"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Type Selector (Only for Top-Level Categories) */}
        {!isSubcategory && (
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
        )}

        {/* Monthly Budget Limit (Supported for both Category and Subcategory) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">
            {isSubcategory
              ? "Subcategory Monthly Budget Limit (optional)"
              : "Monthly Budget Limit (optional)"}
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

        {/* Icon Picker (Only for Top-Level Categories) */}
        {!isSubcategory && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-ink-subtle pl-1">Theme Color</label>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                      color === c
                        ? "scale-110 ring-2 ring-ink-primary ring-offset-2"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-ink-subtle pl-1">Icon</label>
              <IconPicker selected={icon} onSelect={setIcon} />
            </div>

            {/* Budget Rollover Toggle */}
            <div className="p-3 bg-surface border border-line-subtle rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-ink-primary">
                  Budget Rollover (Carryover)
                </span>
                <span className="text-[11px] text-ink-subtle">
                  Carry over unspent budget or deficit to following months
                </span>
              </div>
              <input
                type="checkbox"
                checked={rollover}
                onChange={(e) => setRollover(e.target.checked)}
                className="accent-ink-primary cursor-pointer w-4 h-4"
              />
            </div>
          </>
        )}
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
            : isSubcategory
            ? "Add Subcategory"
            : "Add Category"}
        </button>
      </div>
    </div>
  );
}
