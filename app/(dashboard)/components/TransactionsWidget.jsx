"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BiEdit, BiSearch, BiTrash } from "react-icons/bi";
import { toast } from "sonner";
import { cFormat } from "@/app/utils/currencyFormat";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { TransactionApi } from "@/app/services/ApiClient";
import {
  useCategoriesQuery,
  useTransactionMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";
import ActionModal from "@/app/components/ActionModal";
import Dropdown from "@/app/components/Dropdown";
import AddTransactionSidebar from "./AddTransactionSidebar";

export default function TransactionsWidget({
  showSearch = false,
  showFilters = false,
  compact = false,
  pageSize = 20,
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [walletFilter, setWalletFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { open } = useRhsSidebarStore();
  const { deleteTransaction, invalidateAll } = useTransactionMutations();
  const { data: wallets = [] } = useWalletsQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const mapTransaction = (txn) => {
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
      full_transaction: txMeta,
    };
  };

  const fetchData = useCallback(
    async (pageIndex, reset = false) => {
      setLoading(true);
      try {
        const res = await TransactionApi.list({
          page: pageIndex,
          pageSize,
          type: filter,
          search: debouncedSearch,
          wallet: walletFilter,
          category: categoryFilter,
        });

        const mapped = (res.items || []).map(mapTransaction);
        setHasMore(Boolean(res.hasMore));
        setItems((prev) => {
          if (reset) return mapped;
          const existingIds = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((m) => !existingIds.has(m.id))];
        });
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        toast.error(err.message || "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, filter, debouncedSearch, walletFilter, categoryFilter]
  );

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [fetchData]);

  useEffect(() => {
    const handler = () => {
      setPage(0);
      fetchData(0, true);
    };
    window.addEventListener("fintrack:transactions-updated", handler);
    return () =>
      window.removeEventListener("fintrack:transactions-updated", handler);
  }, [fetchData]);

  const observerTarget = useRef(null);
  useEffect(() => {
    const el = observerTarget.current;
    if (!el || compact) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchData(next, false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, compact, fetchData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTransaction.mutateAsync(deleteTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success("Transaction deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete transaction");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (item) => {
    open(AddTransactionSidebar, {
      transaction: item,
      onSuccess: (updatedTxn) => {
        invalidateAll();
        if (updatedTxn) {
          const mapped = mapTransaction(updatedTxn);
          setItems((prev) => {
            const updatedList = prev.map((p) =>
              p.id === mapped.id ? mapped : p
            );
            return [...updatedList].sort(
              (a, b) => new Date(b.original_date) - new Date(a.original_date)
            );
          });
        } else {
          fetchData(0, true);
        }
      },
    });
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

  return (
    <>
      <div
        className={`flex flex-col gap-3 rounded-2xl h-full ${
          compact
            ? "bg-surface-elevated/60 border border-white/[0.05] p-4"
            : "bg-surface-elevated/50 border border-white/[0.06] p-5 min-h-[380px]"
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
                      ? "bg-white/[0.1] text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
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
                    triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-white/[0.06] hover:bg-surface-hover text-xs sm:text-sm text-zinc-300 px-3.5 py-2 rounded-full focus:outline-none cursor-pointer transition-colors"
                  />
                </div>

                <div className="w-36 sm:w-44">
                  <Dropdown
                    ariaLabel="Filter by category"
                    options={[
                      { key: "", name: "All Categories" },
                      ...categories.map((c) => ({ key: c.name, name: c.name })),
                    ]}
                    value={{
                      key: categoryFilter,
                      name: categoryFilter || "All Categories",
                    }}
                    onChange={(opt) => setCategoryFilter(opt.key)}
                    triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-white/[0.06] hover:bg-surface-hover text-xs sm:text-sm text-zinc-300 px-3.5 py-2 rounded-full focus:outline-none cursor-pointer transition-colors"
                  />
                </div>
              </>
            )}

            {showSearch && (
              <div className="flex items-center gap-2 bg-surface border border-white/[0.06] px-3.5 py-2 rounded-full w-full sm:w-60">
                <BiSearch className="text-zinc-500 shrink-0" size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search note or payee..."
                  className="bg-transparent text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grow overflow-y-auto scrollbar-minimal pr-1">
          {Object.entries(groupedData).map(([date, groupItems]) => (
            <div key={date} className="flex flex-col gap-1 py-1.5">
              <div className="text-zinc-500 text-xs font-normal sticky top-0 bg-surface-elevated/95 backdrop-blur-sm py-1 px-1 rounded">
                {date}
              </div>

              <div className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
                  const isIncome = item.type === "income";
                  const isTransfer = item.type === "transfer";
                  const amountClass = isIncome
                    ? "text-green-100"
                    : isTransfer
                    ? "text-zinc-300"
                    : "text-zinc-200";
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
                      className="group flex justify-between items-center w-full py-2.5 px-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onDoubleClick={() => handleEdit(item)}
                    >
                      <div className="flex gap-3 items-center flex-1 min-w-0">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                            isIncome
                              ? "bg-green-10 text-green-100"
                              : isTransfer
                              ? "bg-white/[0.08] text-zinc-200"
                              : "bg-white/[0.06] text-zinc-400"
                          }`}
                        >
                          {isIncome ? "↓" : isTransfer ? "⇄" : "↑"}
                        </div>

                        <div className="flex flex-col min-w-0 w-full pr-3">
                          <span
                            className="text-zinc-200 font-normal text-sm truncate"
                            title={item.note}
                          >
                            {title}
                          </span>
                          <span className="flex gap-1.5 items-center text-xs mt-0.5 text-zinc-500">
                            {isTransfer && item.to_wallet ? (
                              <span>
                                {item.wallet.replace("Debit Card", "Card")} →{" "}
                                {item.to_wallet.replace("Debit Card", "Card")}
                              </span>
                            ) : (
                              <>
                                <span>{item.wallet.replace("Debit Card", "Card")}</span>
                                {item.category !== "Uncategorized" && (
                                  <span>• {item.category}</span>
                                )}
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2 shrink-0">
                        <span
                          className={`${amountClass} text-sm font-medium whitespace-nowrap group-hover:hidden`}
                        >
                          {sign}
                          {cFormat(item.amount, { currency })}
                        </span>

                        <div className="hidden group-hover:flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer"
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
                            className="p-1.5 text-zinc-400 hover:text-red-100 hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer"
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
            <div className="text-center py-10 text-zinc-500 text-sm">
              No transactions found.
            </div>
          )}

          {!compact && (
            <div className="py-5 text-center">
              {loading ? (
                <span className="text-zinc-500 text-sm">
                  Loading transactions...
                </span>
              ) : hasMore ? (
                <div
                  ref={observerTarget}
                  className="h-4 w-full flex justify-center items-center"
                >
                  <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                </div>
              ) : items.length > 0 ? (
                <span className="text-zinc-600 text-xs">End of list</span>
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
    </>
  );
}
