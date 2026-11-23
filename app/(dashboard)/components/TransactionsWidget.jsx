"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BiCopy, BiEdit, BiSearch, BiTag, BiTrash } from "react-icons/bi";
import { toast } from "sonner";
import { cFormat } from "@/app/utils/currencyFormat";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import {
  useCategoriesQuery,
  useCategoryMutations,
  useTransactionMutations,
  useTransactionsInfinite,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import ActionModal from "@/app/components/ActionModal";
import Dropdown from "@/app/components/Dropdown";
import Checkbox from "@/app/components/Checkbox";
import AddTransactionSidebar from "./AddTransactionSidebar";

function mapTransaction(txn) {
  const txMeta = txn.transaction || {};
  const createdDate = new Date(txn.created_at);
  return {
    id: txn.id,
    type: txn.type,
    original_date: createdDate,
    date: createdDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    iso_date: createdDate.toISOString().split("T")[0],
    amount: txn.amount,
    category:
      txn.category ||
      (typeof txMeta.category === "string"
        ? txMeta.category
        : txMeta.category?.name) ||
      "Uncategorized",
    subcategory:
      txn.subcategory ||
      (typeof txMeta.subcategory === "string"
        ? txMeta.subcategory
        : txMeta.subcategory?.name) ||
      null,
    wallet:
      txn.wallet ||
      (typeof txMeta.wallet === "string"
        ? txMeta.wallet
        : txMeta.wallet?.name) ||
      "Cash",
    to_wallet:
      txn.to_wallet ||
      (typeof txMeta.to_wallet === "string"
        ? txMeta.to_wallet
        : txMeta.to_wallet?.name) ||
      "",
    note: txn.note || txMeta.note || "",
    payee: txn.payee || txMeta.payee || "",
    closing_balance: txMeta.closing_balance ?? null,
    splits: Array.isArray(txn.splits)
      ? txn.splits
      : Array.isArray(txMeta.splits)
      ? txMeta.splits
      : [],
    tags: Array.isArray(txn.tags)
      ? txn.tags
      : Array.isArray(txMeta.tags)
      ? txMeta.tags
      : [],
    is_adjustment: Boolean(txn.is_adjustment || txMeta.is_adjustment),
    recurring_id: txn.recurring_id || txMeta.recurring_id || null,
    full_transaction: txMeta,
  };
}

export default function TransactionsWidget({
  showSearch = false,
  showFilters = false,
  compact = false,
  pageSize = 20,
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlCategory = searchParams?.get("category") || "";
  const [filter, setFilter] = useState("");
  const [walletFilter, setWalletFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(urlCategory);
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (urlCategory && urlCategory !== categoryFilter) {
      setCategoryFilter(urlCategory);
    }
  }, [urlCategory]);

  const { open } = useRhsSidebarStore();
  const { deleteTransaction } = useTransactionMutations();
  const { data: wallets = [] } = useWalletsQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTransactionsInfinite({
    pageSize,
    type: filter,
    search: debouncedSearch,
    wallet: walletFilter,
    category: categoryFilter,
    tag: tagFilter,
  });

  const categoryFilterOptions = useMemo(() => {
    const parents = categories.filter((c) => !c.parent_id && !c.parentId);
    const children = categories.filter((c) => c.parent_id || c.parentId);
    const opts = [];
    for (const p of parents) {
      opts.push({ key: p.name, name: p.name });
      const subs = children.filter(
        (c) => String(c.parent_id || c.parentId) === String(p.id)
      );
      for (const s of subs) {
        opts.push({ key: s.name, name: `↳ ${s.name} (${p.name})` });
      }
    }
    return opts;
  }, [categories]);

  const items = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set();
    const list = [];
    for (const page of data.pages) {
      for (const raw of page.items || []) {
        if (seen.has(raw.id)) continue;
        seen.add(raw.id);
        list.push(mapTransaction(raw));
      }
    }
    return list;
  }, [data]);

  const availableTags = useMemo(() => {
    const set = new Set();
    for (const item of items) {
      for (const t of item.tags || []) {
        set.add(t);
      }
    }
    return Array.from(set);
  }, [items]);

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await deleteTransaction.mutateAsync(id);
      }
      toast.success(`Deleted ${ids.length} transactions`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.message || "Failed to delete selected transactions");
    } finally {
      setBulkDeleting(false);
      setBulkDeleteModalOpen(false);
    }
  };

  const handleDuplicate = (item) => {
    open(AddTransactionSidebar, {
      initialValues: {
        amount: item.amount,
        note: item.note ? `${item.note} (Copy)` : item.payee || "Copy",
        category: item.category,
        subcategory: item.subcategory,
        wallet: item.wallet,
        type: item.type,
        tags: item.tags,
      },
    });
  };

  const observerTarget = useRef(null);
  useEffect(() => {
    const el = observerTarget.current;
    if (!el || compact) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, compact]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTransaction.mutateAsync(deleteTarget.id);
      toast.success("Transaction deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete transaction");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (item) => {
    open(AddTransactionSidebar, { transaction: item });
  };

  const groupedData = items.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const filterTabs = [
    { key: "", label: "All" },
    { key: "income", label: "Income" },
    { key: "expense", label: "Expenses" },
    { key: "transfer", label: "Transfers" },
  ];

  const loading = isLoading || isFetchingNextPage;

  return (
    <>
      <div
        className={`flex flex-col gap-3 rounded-2xl h-full ${
          compact
            ? "bg-surface-elevated/60 border border-line-faint p-4"
            : "bg-surface-elevated/50 border border-line-subtle p-5 min-h-[380px]"
        }`}
      >
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            {filterTabs.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  type="button"
                  key={tab.label}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full cursor-pointer transition-colors font-normal ${
                    active
                      ? "bg-tint-active text-ink-primary"
                      : "text-ink-subtle hover:text-ink-body"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {showFilters && (
              <>
                <div className="w-36 sm:w-40">
                  <Dropdown
                    ariaLabel="Filter by wallet"
                    options={[
                      { key: "", name: "All Wallets" },
                      ...wallets.map((w) => ({ key: w.name, name: w.name })),
                    ]}
                    value={{
                      key: walletFilter,
                      name: walletFilter || "All Wallets",
                    }}
                    onChange={(opt) => setWalletFilter(opt.key)}
                    triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-line-subtle hover:bg-surface-hover text-xs sm:text-sm text-ink-body px-3.5 py-2 rounded-full focus:outline-none cursor-pointer transition-colors"
                  />
                </div>

                <div className="w-36 sm:w-48">
                  <Dropdown
                    ariaLabel="Filter by category"
                    options={[
                      { key: "", name: "All Categories" },
                      ...categoryFilterOptions,
                    ]}
                    value={{
                      key: categoryFilter,
                      name: categoryFilter || "All Categories",
                    }}
                    onChange={(opt) => {
                      setCategoryFilter(opt.key);
                      if (pathname && searchParams) {
                        const nextParams = new URLSearchParams(searchParams.toString());
                        if (opt.key) {
                          nextParams.set("category", opt.key);
                        } else {
                          nextParams.delete("category");
                        }
                        const qs = nextParams.toString();
                        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                      }
                    }}
                    triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-line-subtle hover:bg-surface-hover text-xs sm:text-sm text-ink-body px-3.5 py-2 rounded-full focus:outline-none cursor-pointer transition-colors"
                  />
                </div>

                {availableTags.length > 0 && (
                  <div className="w-32 sm:w-40">
                    <Dropdown
                      ariaLabel="Filter by tag"
                      options={[
                        { key: "", name: "All Tags" },
                        ...availableTags.map((t) => ({ key: t, name: `#${t}` })),
                      ]}
                      value={{
                        key: tagFilter,
                        name: tagFilter ? `#${tagFilter}` : "All Tags",
                      }}
                      onChange={(opt) => setTagFilter(opt.key)}
                      triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-line-subtle hover:bg-surface-hover text-xs sm:text-sm text-ink-body px-3.5 py-2 rounded-full focus:outline-none cursor-pointer transition-colors"
                    />
                  </div>
                )}
              </>
            )}

            {showSearch && (
              <div className="flex items-center gap-2 bg-surface border border-line-subtle px-3.5 py-2 rounded-full w-full sm:w-60">
                <BiSearch className="text-ink-subtle shrink-0" size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search note or payee..."
                  className="bg-transparent text-xs sm:text-sm text-ink-secondary placeholder:text-ink-placeholder focus:outline-none w-full"
                />
              </div>
            )}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-surface border border-line-subtle px-3.5 py-2 rounded-xl text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink-primary">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-ink-subtle hover:text-ink-body underline cursor-pointer"
              >
                {selectedIds.size === items.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-red-10 hover:bg-red-20 text-red-100 text-xs font-normal cursor-pointer flex items-center gap-1 transition-colors"
              >
                <BiTrash size={13} />
                <span>Delete Selected</span>
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 text-xs text-ink-subtle hover:text-ink-primary cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grow overflow-y-auto scrollbar-minimal pr-1">
          {Object.entries(groupedData).map(([date, groupItems]) => (
            <div key={date} className="flex flex-col gap-1 py-1.5">
              <div className="text-ink-subtle text-xs font-normal sticky top-0 bg-surface-elevated/95 backdrop-blur-sm py-1 px-1 rounded flex items-center justify-between">
                <span>{date}</span>
                {groupItems.length > 1 && (
                  <span className="text-[11px] text-ink-faint">
                    {groupItems.length} transactions
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
                  const isIncome = item.type === "income";
                  const isTransfer = item.type === "transfer";
                  const isSelected = selectedIds.has(item.id);
                  const amountClass = isIncome
                    ? "text-green-100"
                    : isTransfer
                    ? "text-ink-body"
                    : "text-ink-secondary";
                  const sign = isIncome ? "+" : isTransfer ? "" : "-";
                  let title =
                    item.payee &&
                    item.payee !== "Unknown" &&
                    item.payee !== "Transfer"
                      ? item.payee
                      : item.note || "Transaction";
                  if (title.length > 48) title = `${title.substring(0, 48)}...`;

                  return (
                    <div
                      key={item.id}
                      className={`group flex justify-between items-center w-full py-2.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                        isSelected ? "bg-tint-active" : "hover:bg-tint-subtle"
                      }`}
                      onDoubleClick={() => handleEdit(item)}
                    >
                      <div className="flex gap-2.5 items-center flex-1 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                          ariaLabel="Select transaction"
                        />

                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                            isIncome
                              ? "bg-green-10 text-green-100"
                              : isTransfer
                              ? "bg-tint-hover text-ink-secondary"
                              : "bg-tint text-ink-muted"
                          }`}
                        >
                          {isIncome ? "↓" : isTransfer ? "⇄" : "↑"}
                        </div>

                        <div className="flex flex-col min-w-0 w-full pr-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-ink-secondary font-normal text-sm truncate"
                              title={item.note}
                            >
                              {title}
                            </span>
                            {item.splits && item.splits.length > 0 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-tint text-ink-body font-normal"
                                title={item.splits
                                  .map(
                                    (s) =>
                                      `${s.category?.name || s.category}: ₹${s.amount}`
                                  )
                                  .join(", ")}
                              >
                                Split ({item.splits.length})
                              </span>
                            )}
                            {item.is_adjustment && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-normal">
                                Adjustment
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 items-center text-xs mt-0.5 text-ink-subtle">
                            {isTransfer && item.to_wallet ? (
                              <span>
                                {item.wallet.replace("Debit Card", "Card")} →{" "}
                                {item.to_wallet.replace("Debit Card", "Card")}
                              </span>
                            ) : (
                              <>
                                <span>
                                  {item.wallet.replace("Debit Card", "Card")}
                                </span>
                                {item.category !== "Uncategorized" && (
                                  <span>
                                    • {item.category}
                                    {item.subcategory ? ` › ${item.subcategory}` : ""}
                                  </span>
                                )}
                              </>
                            )}

                            {item.tags && item.tags.length > 0 && (
                              <span className="flex items-center gap-1">
                                {item.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.2 rounded text-[10px] bg-surface border border-line-subtle text-ink-muted"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end group-hover:hidden">
                          <span
                            className={`${amountClass} text-sm font-medium whitespace-nowrap tabular-nums`}
                          >
                            {sign}
                            {cFormat(item.amount, { currency })}
                          </span>
                          {item.closing_balance !== null && item.closing_balance !== undefined && (
                            <span className="text-[11px] text-ink-subtle tabular-nums">
                              Bal {cFormat(item.closing_balance, { currency })}
                            </span>
                          )}
                        </div>

                        <div className="hidden group-hover:flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(item);
                            }}
                            className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-tint-hover rounded-full transition-colors cursor-pointer"
                            title="Duplicate"
                          >
                            <BiCopy size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-1.5 text-ink-muted hover:text-ink-primary hover:bg-tint-hover rounded-full transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <BiEdit size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 text-ink-muted hover:text-red-100 hover:bg-tint-hover rounded-full transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <BiTrash size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {items.length === 0 && !loading && (
            <div className="text-center py-10 text-ink-subtle text-sm">
              No transactions found.
            </div>
          )}

          {!compact && (
            <div className="py-5 text-center">
              {loading ? (
                <span className="text-ink-subtle text-sm">
                  Loading transactions...
                </span>
              ) : hasNextPage ? (
                <div
                  ref={observerTarget}
                  className="h-4 w-full flex justify-center items-center"
                >
                  <div className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce" />
                </div>
              ) : items.length > 0 ? (
                <span className="text-ink-faint text-xs">End of list</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <ActionModal
        isOpen={Boolean(deleteTarget)}
        content={`Delete "${
          deleteTarget?.note || deleteTarget?.payee || "this transaction"
        }"?`}
        primaryBtnText="Delete"
        secBtnText="Cancel"
        primaryAction={confirmDelete}
        secAction={() => setDeleteTarget(null)}
      />

      <ActionModal
        isOpen={bulkDeleteModalOpen}
        content={`Are you sure you want to delete ${selectedIds.size} selected transactions?`}
        primaryBtnText={bulkDeleting ? "Deleting..." : "Delete All"}
        secBtnText="Cancel"
        primaryAction={confirmBulkDelete}
        secAction={() => setBulkDeleteModalOpen(false)}
      />
    </>
  );
}
