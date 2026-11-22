"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BiChevronDown, BiCheck, BiSearch, BiPlus } from "react-icons/bi";
import RenderIcon from "@/app/components/RenderIcon";

/**
 * Single searchable hierarchical grouped dropdown for categories and subcategories.
 * e.g. "Food & Dining > Breakfast"
 */
export default function HierarchicalCategorySelect({
  categories = [],
  value = null,
  onChange,
  placeholder = "Select Category",
  className = "",
  triggerClass = "",
  ariaLabel = "Select Category",
  onCreateSubcategory = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Group raw categories into hierarchical structure: parents with child subcategories
  const hierarchy = useMemo(() => {
    const parents = [];
    const childrenByParentId = new Map();

    for (const cat of categories) {
      if (!cat.parent_id && !cat.parentId) {
        parents.push(cat);
      } else {
        const pId = String(cat.parent_id || cat.parentId);
        if (!childrenByParentId.has(pId)) {
          childrenByParentId.set(pId, []);
        }
        childrenByParentId.get(pId).push(cat);
      }
    }

    return parents.map((parent) => ({
      ...parent,
      subcategories: childrenByParentId.get(String(parent.id)) || [],
    }));
  }, [categories]);

  // Parse current selected state
  const selectedInfo = useMemo(() => {
    if (!value) return null;
    let catName = "";
    let subName = "";

    if (typeof value === "string") {
      if (value.includes(" > ")) {
        const parts = value.split(" > ");
        catName = parts[0]?.trim();
        subName = parts[1]?.trim();
      } else if (value.includes(" / ")) {
        const parts = value.split(" / ");
        catName = parts[0]?.trim();
        subName = parts[1]?.trim();
      } else {
        catName = value.trim();
      }
    } else if (typeof value === "object") {
      catName = value.category?.name || value.category || value.name || "";
      subName = value.subcategory?.name || value.subcategory || "";
    }

    const parentCat = hierarchy.find(
      (p) => p.name.toLowerCase() === catName.toLowerCase()
    );

    return {
      category: parentCat?.name || catName,
      subcategory: subName || null,
      parentIcon: parentCat?.icon || null,
      displayLabel: subName ? `${parentCat?.name || catName} › ${subName}` : parentCat?.name || catName,
    };
  }, [value, hierarchy]);

  // Filter hierarchy based on search query
  const filteredHierarchy = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hierarchy;

    const matched = [];
    for (const parent of hierarchy) {
      const parentMatches = parent.name.toLowerCase().includes(q);
      const matchingSubs = (parent.subcategories || []).filter((sub) =>
        sub.name.toLowerCase().includes(q)
      );

      if (parentMatches || matchingSubs.length > 0) {
        matched.push({
          ...parent,
          // If parent matched, show all its subs; otherwise only matching subs
          subcategories: parentMatches ? parent.subcategories : matchingSubs,
        });
      }
    }
    return matched;
  }, [hierarchy, search]);

  const handleSelectParent = (parent) => {
    if (onChange) {
      onChange({
        key: parent.name,
        name: parent.name,
        category: parent.name,
        subcategory: null,
        label: parent.name,
        icon: parent.icon,
      });
    }
    setIsOpen(false);
  };

  const handleSelectSubcategory = (parent, sub) => {
    if (onChange) {
      onChange({
        key: `${parent.name} > ${sub.name}`,
        name: parent.name,
        category: parent.name,
        subcategory: sub.name,
        label: `${parent.name} › ${sub.name}`,
        icon: parent.icon,
      });
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          triggerClass ||
          `w-full py-2.5 px-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 text-sm ${
            isOpen
              ? "bg-surface-hover border-line-strong"
              : "bg-surface-elevated border-line-subtle hover:bg-surface-hover"
          }`
        }
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {selectedInfo?.parentIcon && (
            <div className="shrink-0 text-ink-muted">
              <RenderIcon
                icon={selectedInfo.parentIcon}
                name={selectedInfo.category}
                props={{ className: "w-4 h-4" }}
              />
            </div>
          )}
          <span
            className={`truncate ${
              selectedInfo?.category ? "text-ink-primary font-medium" : "text-ink-subtle"
            }`}
          >
            {selectedInfo?.displayLabel || placeholder}
          </span>
        </div>

        <BiChevronDown
          size={18}
          className={`text-ink-subtle shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-ink-body" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-full min-w-[240px] bg-surface-elevated border border-line-subtle rounded-xl shadow-dropdown-sm z-50 overflow-hidden animate-modal-in flex flex-col max-h-80">
          {/* Search Header */}
          <div className="p-2 border-b border-line-faint">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-line-subtle rounded-lg">
              <BiSearch size={15} className="text-ink-subtle shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category or subcategory..."
                className="w-full text-xs text-ink-primary bg-transparent placeholder:text-ink-placeholder focus:outline-none"
              />
            </div>
          </div>

          {/* Grouped Options List */}
          <div className="overflow-y-auto scrollbar-minimal p-1.5 flex flex-col gap-1 grow">
            {filteredHierarchy.length === 0 ? (
              <div className="py-6 text-center text-xs text-ink-subtle">
                No matching categories found
              </div>
            ) : (
              filteredHierarchy.map((parent) => {
                const isParentSelected =
                  selectedInfo?.category?.toLowerCase() === parent.name.toLowerCase() &&
                  !selectedInfo?.subcategory;

                return (
                  <div key={parent.id || parent.name} className="flex flex-col">
                    {/* Parent Category Row */}
                    <button
                      type="button"
                      onClick={() => handleSelectParent(parent)}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isParentSelected
                          ? "bg-tint-active text-ink-primary font-medium"
                          : "text-ink-secondary hover:bg-surface-hover/80 hover:text-ink-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <RenderIcon
                          icon={parent.icon}
                          name={parent.name}
                          props={{ className: "w-3.5 h-3.5 text-ink-muted shrink-0" }}
                        />
                        <span className="truncate font-medium">{parent.name}</span>
                      </div>
                      {isParentSelected && <BiCheck size={16} className="text-cta shrink-0" />}
                    </button>

                    {/* Subcategories (Indented) */}
                    {parent.subcategories?.length > 0 && (
                      <div className="flex flex-col pl-4 pr-1 py-0.5 border-l border-line-faint ml-3.5 my-0.5 gap-0.5">
                        {parent.subcategories.map((sub) => {
                          const isSubSelected =
                            selectedInfo?.category?.toLowerCase() === parent.name.toLowerCase() &&
                            selectedInfo?.subcategory?.toLowerCase() === sub.name.toLowerCase();

                          return (
                            <button
                              key={sub.id || sub.name}
                              type="button"
                              onClick={() => handleSelectSubcategory(parent, sub)}
                              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left ${
                                isSubSelected
                                  ? "bg-tint-active text-ink-primary font-medium"
                                  : "text-ink-body hover:bg-surface-hover/80 hover:text-ink-primary"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-ink-subtle text-[11px] shrink-0">↳</span>
                                <span className="truncate">{sub.name}</span>
                              </div>
                              {isSubSelected && (
                                <BiCheck size={15} className="text-cta shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
