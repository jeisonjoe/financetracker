"use client";

import Calendar from "@/app/components/Calender";
import Dropdown from "@/app/components/Dropdown";
import HierarchicalCategorySelect from "@/app/components/HierarchicalCategorySelect";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import {
  useCategoriesQuery,
  useRuleMutations,
  useTransactionMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { getCurrencySymbol } from "@/app/utils/currencyFormat";
import { useEffect, useMemo, useRef, useState } from "react";
import { BiCalendar, BiPlus, BiTime, BiTrash } from "react-icons/bi";
import { toast } from "sonner";

const LAST_WALLET_STORAGE_KEY = "fintrack:lastWallet";

function formatCurrentTime() {
  const date = new Date();
  let hr = date.getHours();
  const ampm = hr >= 12 ? "PM" : "AM";
  hr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${String(hr).padStart(2, "0")}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )} ${ampm}`;
}

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
}

export default function AddTransactionSidebar(props) {
  const { transaction, initialType, initialValues, onSuccess } = props;
  const transactionTypes = ["expense", "income", "transfer"];
  const { isOpen, close, setProps } = useRhsSidebarStore();
  const { user } = useAuth();
  const currencySymbol = getCurrencySymbol(user?.currency || "INR");

  const { data: rawCategories = [] } = useCategoriesQuery();
  const { data: rawWallets = [] } = useWalletsQuery();
  const { createTransaction, updateTransaction } = useTransactionMutations();
  const { createRule } = useRuleMutations();

  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState(initialType || initialValues?.type || transactionTypes[0]);
  const [category, setCategory] = useState({});
  const [wallet, setWallet] = useState({});
  const [toWallet, setToWallet] = useState({});
  const [data, setData] = useState({
    amount: initialValues?.amount ? String(initialValues.amount) : "",
    note: initialValues?.note || initialValues?.title || "",
    time: formatCurrentTime(),
    date: new Date(),
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  const [isSplit, setIsSplit] = useState(false);
  const [splitPerson, setSplitPerson] = useState("");
  const [splitType, setSplitType] = useState("lent");

  // Multi-category split transactions
  const [hasCategorySplits, setHasCategorySplits] = useState(false);
  const [categorySplits, setCategorySplits] = useState([]);

  // Tags & Labels
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Rule creation prompt
  const [rememberRule, setRememberRule] = useState(false);

  const filteredCategories = useMemo(() => {
    return rawCategories.filter((c) => {
      if (type === "income") return c.type === "income" || c.type === "both";
      if (type === "expense") return c.type === "expense" || c.type === "both";
      return true;
    });
  }, [rawCategories, type]);

  const wallets = useMemo(
    () => rawWallets.map((w) => ({ key: w.name, name: w.name })),
    [rawWallets]
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (transaction) {
      setData({
        amount: Number(transaction.amount) || "",
        note: transaction.note || transaction.payee || "",
        time: transaction.full_transaction?.time || formatCurrentTime(),
        date: transaction.original_date
          ? new Date(transaction.original_date)
          : new Date(),
      });
      setType(transaction.type || "expense");

      const meta = transaction.full_transaction || transaction.transaction || {};
      const catName =
        typeof transaction.category === "string"
          ? transaction.category
          : transaction.category?.name || meta.category?.name || meta.category || "";
      const subName =
        transaction.subcategory ||
        meta.subcategory?.name ||
        meta.subcategory ||
        null;

      setCategory({
        key: subName ? `${catName} > ${subName}` : catName,
        name: catName,
        category: catName,
        subcategory: subName,
        label: subName ? `${catName} › ${subName}` : catName,
      });

      const walVal =
        typeof transaction.wallet === "string"
          ? { key: transaction.wallet, name: transaction.wallet }
          : transaction.wallet;
      setWallet(walVal || {});

      const toWalRaw =
        transaction.to_wallet || transaction.full_transaction?.to_wallet;
      const toWalVal =
        typeof toWalRaw === "string"
          ? { key: toWalRaw, name: toWalRaw }
          : toWalRaw;
      setToWallet(toWalVal || {});
      setIsSplit(Boolean(meta.is_split || transaction.is_split));
      setSplitPerson(meta.split_person || transaction.split_person || "");
      setSplitType(meta.split_type || transaction.split_type || (transaction.type === "income" ? "settlement" : "lent"));

      const txTags = transaction.tags || meta.tags || [];
      setTags(Array.isArray(txTags) ? txTags : []);

      const txSplits = transaction.splits || meta.splits || [];
      if (Array.isArray(txSplits) && txSplits.length > 0) {
        setHasCategorySplits(true);
        setCategorySplits(txSplits);
      } else {
        setHasCategorySplits(false);
        setCategorySplits([]);
      }
    } else {
      setData({
        amount: initialValues?.amount ? String(initialValues.amount) : "",
        note: initialValues?.note || initialValues?.title || "",
        time: formatCurrentTime(),
        date: initialValues?.date ? new Date(initialValues.date) : new Date(),
      });
      setType(initialType || initialValues?.type || "expense");
      setIsSplit(false);
      setSplitPerson("");
      setSplitType("lent");
      setTags(initialValues?.tags || []);
      setHasCategorySplits(false);
      setCategorySplits([]);

      if (initialValues?.category) {
        setCategory({
          key: initialValues.category,
          name: initialValues.category,
          category: initialValues.category,
          subcategory: initialValues.subcategory || null,
          label: initialValues.subcategory
            ? `${initialValues.category} › ${initialValues.subcategory}`
            : initialValues.category,
        });
      }
      if (initialValues?.wallet) {
        setWallet({ key: initialValues.wallet, name: initialValues.wallet });
      }
    }
  }, [transaction, initialType, initialValues]);

  // Keep selected category aligned with the active transaction type
  useEffect(() => {
    if (type === "transfer" || filteredCategories.length === 0) return;
    const catName = category?.name || category?.category;
    const stillValid = filteredCategories.some((c) => c.name === catName);
    if (!transaction && (!catName || !stillValid)) {
      const defaultParent = filteredCategories.find((c) => !c.parent_id && !c.parentId) || filteredCategories[0];
      if (defaultParent) {
        setCategory({
          key: defaultParent.name,
          name: defaultParent.name,
          category: defaultParent.name,
          subcategory: null,
          label: defaultParent.name,
        });
      }
    }
  }, [transaction, type, filteredCategories, category]);

  // Default to last-used wallet when creating a new transaction
  useEffect(() => {
    if (transaction || wallets.length === 0) return;
    if (!wallet?.name) {
      let preferred = null;
      try {
        const savedName = window.localStorage.getItem(LAST_WALLET_STORAGE_KEY);
        preferred = wallets.find((w) => w.name === savedName) || null;
      } catch {
        preferred = null;
      }
      setWallet(preferred || wallets[0]);
    }
    if (wallets.length > 1 && !toWallet?.name) {
      const currentName = wallet?.name || wallets[0]?.name;
      const second = wallets.find((w) => w.name !== currentName) || wallets[1];
      setToWallet(second);
    }
  }, [transaction, wallets, wallet?.name, toWallet?.name]);

  const handleClose = () => {
    if (isLoading) return;
    close();
  };

  useEffect(() => {
    setProps({
      onclose: handleClose,
      title: transaction ? "Edit Transaction" : "New Transaction",
    });
  }, [isOpen, transaction]);

  const handleData = (key, val) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const handleWalletSelect = (selected) => {
    setWallet(selected);
    try {
      if (selected?.name) {
        window.localStorage.setItem(LAST_WALLET_STORAGE_KEY, selected.name);
      }
    } catch {
      // Ignore storage errors in restricted environments
    }
  };

  const handleSubmitData = async (e) => {
    if (e) e.preventDefault();
    if (!user) return;
    if (!data.amount || Number(data.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (type === "transfer") {
      if (!wallet?.name || !toWallet?.name) {
        toast.error("Select both source and destination wallets");
        return;
      }
      if (wallet.name === toWallet.name) {
        toast.error("Source and destination wallets must be different");
        return;
      }
    }

    if (hasCategorySplits && categorySplits.length > 0) {
      const splitSum = categorySplits.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0
      );
      if (Math.abs(splitSum - Number(data.amount)) > 1) {
        toast.error(
          `Sum of split categories (${splitSum}) must match total amount (${Number(data.amount)})`
        );
        return;
      }
    }

    setIsLoading(true);
    const isTransfer = type === "transfer";
    const transferLabel = `${wallet.name} → ${toWallet.name}`;
    const payload = {
      type,
      amount: Number(data.amount),
      created_at: data.date
        ? new Date(data.date).toISOString()
        : new Date().toISOString(),
      transaction: {
        note: data.note || (isTransfer ? transferLabel : ""),
        time: data.time || formatCurrentTime(),
        category: isTransfer
          ? { key: "Transfer", name: "Transfer" }
          : {
              key: category.name || category.category || "Uncategorized",
              name: category.name || category.category || "Uncategorized",
            },
        ...(category.subcategory
          ? {
              subcategory: {
                key: category.subcategory,
                name: category.subcategory,
              },
            }
          : {}),
        wallet,
        ...(isTransfer ? { to_wallet: toWallet } : {}),
        payee: data.note || (isTransfer ? transferLabel : ""),
        is_split: isSplit,
        split_person: isSplit && splitPerson ? splitPerson.trim() : null,
        split_type: isSplit ? splitType : null,
        tags: tags.map((t) => t.replace(/^#/, "").trim()).filter(Boolean),
        splits: hasCategorySplits ? categorySplits : [],
        ...(initialValues?.recurring_id
          ? { recurring_id: String(initialValues.recurring_id) }
          : {}),
      },
    };

    try {
      const response = transaction
        ? await updateTransaction.mutateAsync({ id: transaction.id, payload })
        : await createTransaction.mutateAsync(payload);

      if (rememberRule && data.note?.trim() && (category.name || category.category)) {
        try {
          await createRule.mutateAsync({
            pattern: data.note.trim(),
            category: category.name || category.category,
            subcategory: category.subcategory || null,
            payee: data.note.trim(),
            tags,
          });
          toast.success("Saved merchant rule for future transactions");
        } catch {
          // ignore rule error
        }
      }

      try {
        if (wallet?.name) {
          window.localStorage.setItem(LAST_WALLET_STORAGE_KEY, wallet.name);
        }
      } catch {
        // Ignore storage errors
      }

      toast.success(
        transaction ? "Transaction updated" : "Transaction added successfully"
      );
      if (onSuccess) onSuccess(response?.data);
      close();
    } catch (error) {
      toast.error(error.message || "Failed to save transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDateKey = toLocalDateKey(data.date || new Date());
  const todayKey = toLocalDateKey(getRelativeDate(0));
  const yesterdayKey = toLocalDateKey(getRelativeDate(-1));
  const isToday = selectedDateKey === todayKey;
  const isYesterday = selectedDateKey === yesterdayKey;

  return (
    <form
      onSubmit={handleSubmitData}
      className="flex flex-col justify-between h-full gap-6"
    >
      <div className="flex flex-col gap-5">
        <div className="flex bg-surface-elevated border border-line-subtle p-1 rounded-full self-start">
          {transactionTypes.map((btn) => (
            <button
              type="button"
              key={btn}
              onClick={() => setType(btn)}
              className={`px-5 py-2 rounded-full text-sm font-normal cursor-pointer capitalize transition-colors ${
                type === btn
                  ? type === "income"
                    ? "bg-green-10 text-green-100"
                    : "bg-cta text-cta-ink"
                  : "text-ink-subtle hover:text-ink-secondary"
              }`}
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">
            Amount
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`text-3xl font-light ${
                type === "income" ? "text-green-100" : "text-ink-body"
              }`}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              className={`w-full text-4xl font-light bg-transparent focus:outline-none placeholder:text-ink-faint tabular-nums ${
                type === "income" ? "text-green-100" : "text-ink-primary"
              }`}
              value={data.amount}
              onChange={(e) => handleData("amount", e.target.value)}
              autoFocus={!transaction}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">
            Description
          </label>
          <input
            type="text"
            className="w-full text-sm px-4 py-3 bg-surface-elevated border border-line-subtle rounded-xl focus:outline-none focus:border-line-focus transition-colors text-ink-primary placeholder:text-ink-placeholder"
            placeholder="What is this for?"
            value={data.note}
            onChange={(e) => handleData("note", e.target.value)}
          />
        </div>

        {/* Friend Split & Lending */}
        {type !== "transfer" && (
          <div className="flex flex-col gap-2 p-3 bg-surface border border-line-subtle rounded-xl">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink-secondary">
              <input
                type="checkbox"
                checked={isSplit}
                onChange={(e) => setIsSplit(e.target.checked)}
                className="accent-ink-primary cursor-pointer"
              />
              <span>Tag as Friend Split / Lending</span>
            </label>

            {isSplit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-line-faint">
                <input
                  type="text"
                  placeholder="Friend's Name (e.g. Viswanathan)"
                  value={splitPerson}
                  onChange={(e) => setSplitPerson(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-surface-elevated border border-line-subtle rounded-lg text-ink-primary placeholder:text-ink-placeholder focus:outline-none"
                />
                <select
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 bg-surface-elevated border border-line-subtle rounded-lg text-ink-primary focus:outline-none"
                >
                  <option value="lent">They owe me (Lent)</option>
                  <option value="settlement">Friend repaid me (Settled)</option>
                  <option value="borrowed">I owe them (Borrowed)</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {type === "transfer" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-normal text-ink-subtle pl-1">
                  From Wallet
                </label>
                <Dropdown
                  options={wallets}
                  placeholder="Select source"
                  value={wallet}
                  onChange={handleWalletSelect}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-normal text-ink-subtle pl-1">
                  To Wallet
                </label>
                <Dropdown
                  options={wallets}
                  placeholder="Select destination"
                  value={toWallet}
                  onChange={setToWallet}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-normal text-ink-subtle pl-1">
                  Category &amp; Subcategory
                </label>
                <HierarchicalCategorySelect
                  categories={filteredCategories}
                  placeholder="Select Category & Subcategory"
                  value={category}
                  onChange={setCategory}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-normal text-ink-subtle pl-1">
                  Wallet
                </label>
                <Dropdown
                  options={wallets}
                  placeholder="Select"
                  value={wallet}
                  onChange={handleWalletSelect}
                />
              </div>
            </>
          )}
        </div>

        {/* Itemized Multi-Category Splits */}
        {type === "expense" && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-surface border border-line-subtle rounded-xl">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink-secondary">
                <input
                  type="checkbox"
                  checked={hasCategorySplits}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasCategorySplits(checked);
                    if (checked && categorySplits.length === 0) {
                      const initialAmount = Math.round(Number(data.amount) / 2) || 0;
                      setCategorySplits([
                        {
                          id: "split-1",
                          category: category.name ? category : { name: "Food & Dining", key: "Food & Dining" },
                          amount: initialAmount,
                          note: "",
                        },
                        {
                          id: "split-2",
                          category: { name: "Groceries", key: "Groceries" },
                          amount: Math.max(0, (Number(data.amount) || 0) - initialAmount),
                          note: "",
                        },
                      ]);
                    }
                  }}
                  className="accent-ink-primary cursor-pointer"
                />
                <span>Split across multiple categories (Itemized)</span>
              </label>

              {hasCategorySplits && (
                <button
                  type="button"
                  onClick={() => {
                    setCategorySplits((prev) => [
                      ...prev,
                      {
                        id: `split-${Date.now()}`,
                        category: { name: "Shopping", key: "Shopping" },
                        amount: 0,
                        note: "",
                      },
                    ]);
                  }}
                  className="text-xs text-ink-body hover:text-ink-primary flex items-center gap-1 font-normal cursor-pointer"
                >
                  <BiPlus size={14} />
                  <span>Add Split</span>
                </button>
              )}
            </div>

            {hasCategorySplits && (
              <div className="flex flex-col gap-2 pt-2 border-t border-line-faint">
                {categorySplits.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex flex-col sm:flex-row gap-2 items-center bg-surface-elevated/70 p-2.5 rounded-lg border border-line-faint"
                  >
                    <div className="w-full sm:w-1/2">
                      <HierarchicalCategorySelect
                        categories={filteredCategories}
                        value={item.category}
                        onChange={(cat) => {
                          setCategorySplits((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, category: cat } : s
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="w-full sm:w-1/4">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.amount || ""}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setCategorySplits((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, amount: val } : s
                            )
                          );
                        }}
                        className="w-full text-xs px-2.5 py-2 bg-surface border border-line-subtle rounded-lg text-ink-primary focus:outline-none"
                      />
                    </div>
                    <div className="w-full sm:w-1/4 flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Note"
                        value={item.note || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCategorySplits((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, note: val } : s
                            )
                          );
                        }}
                        className="w-full text-xs px-2 py-2 bg-surface border border-line-subtle rounded-lg text-ink-primary focus:outline-none"
                      />
                      {categorySplits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategorySplits((prev) =>
                              prev.filter((_, i) => i !== idx)
                            );
                          }}
                          className="text-ink-subtle hover:text-red-100 p-1 cursor-pointer shrink-0"
                          title="Remove split"
                        >
                          <BiTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Calculation summary */}
                {(() => {
                  const total = Number(data.amount) || 0;
                  const allocated = categorySplits.reduce(
                    (s, item) => s + (Number(item.amount) || 0),
                    0
                  );
                  const diff = total - allocated;
                  return (
                    <div className="flex items-center justify-between text-xs px-1 text-ink-subtle">
                      <span>
                        Total: {currencySymbol}{total} | Allocated: {currencySymbol}{allocated}
                      </span>
                      <span
                        className={
                          diff === 0
                            ? "text-green-100 font-medium"
                            : "text-amber-600 font-medium"
                        }
                      >
                        {diff === 0
                          ? "Balanced"
                          : diff > 0
                          ? `Remaining: ${currencySymbol}${diff}`
                          : `Over allocated by ${currencySymbol}${Math.abs(diff)}`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Tags / Labels */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-ink-subtle pl-1">
            Tags &amp; Labels (e.g. #trip, #reimbursable, #tax)
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-surface-elevated border border-line-subtle rounded-xl min-h-[42px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-tint-subtle text-ink-body font-normal"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  className="hover:text-red-100 cursor-pointer text-ink-muted text-xs leading-none"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={tags.length === 0 ? "Type tag and press Enter (or comma)..." : "Add tag..."}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const clean = tagInput.trim().replace(/^#/, "").replace(/,$/, "");
                  if (clean && !tags.includes(clean)) {
                    setTags((prev) => [...prev, clean]);
                  }
                  setTagInput("");
                }
              }}
              className="bg-transparent text-xs text-ink-primary placeholder:text-ink-placeholder focus:outline-none flex-1 min-w-[120px] px-1 py-0.5"
            />
          </div>
        </div>

        {/* Auto-categorization rule reminder */}
        {data.note && category.name && (
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink-subtle pl-1">
            <input
              type="checkbox"
              checked={rememberRule}
              onChange={(e) => setRememberRule(e.target.checked)}
              className="accent-ink-primary cursor-pointer"
            />
            <span>
              Always categorize future transactions for &quot;{data.note}&quot; as {category.name}
            </span>
          </label>
        )}

        <div className="relative flex flex-col gap-2" ref={calendarRef}>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-normal text-ink-subtle pl-1">
              Date &amp; time
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleData("date", getRelativeDate(0));
                  setShowCalendar(false);
                }}
                className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                  isToday
                    ? "bg-cta text-cta-ink font-medium"
                    : "bg-surface-elevated text-ink-muted hover:text-ink-primary"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  handleData("date", getRelativeDate(-1));
                  setShowCalendar(false);
                }}
                className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                  isYesterday
                    ? "bg-cta text-cta-ink font-medium"
                    : "bg-surface-elevated text-ink-muted hover:text-ink-primary"
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors flex items-center gap-1 ${
                  !isToday && !isYesterday
                    ? "bg-cta text-cta-ink font-medium"
                    : "bg-surface-elevated text-ink-muted hover:text-ink-primary"
                }`}
              >
                <BiCalendar size={12} />
                <span>Pick date</span>
              </button>
            </div>
          </div>

          <div
            className="w-full bg-surface-elevated border border-line-subtle rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <div className="flex items-center gap-2.5 text-ink-secondary text-sm font-normal">
              <BiTime className="text-ink-subtle" size={18} />
              <span>
                {new Date(data.date || new Date()).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-ink-faint">|</span>
              <input
                type="text"
                className="bg-transparent w-20 focus:outline-none cursor-pointer text-ink-body"
                value={data.time || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleData("time", e.target.value)}
              />
            </div>
            <span className="text-xs text-ink-muted">
              {showCalendar ? "Hide" : "Change"}
            </span>
          </div>

          {showCalendar && (
            <div className="absolute top-full mt-2 right-0 w-72 p-2 bg-surface-elevated rounded-2xl shadow-dropdown-sm border border-line z-50">
              <Calendar
                value={data.date || new Date()}
                onChange={(dat) => {
                  handleData("date", dat);
                  setShowCalendar(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-line-subtle">
        <button
          type="button"
          className="flex-1 py-3 bg-surface-elevated text-ink-body font-normal hover:bg-surface-hover rounded-full transition-colors cursor-pointer"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3 bg-cta hover:bg-cta-hover text-cta-ink font-medium rounded-full transition-colors cursor-pointer disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : transaction
            ? "Save Changes"
            : "Add Transaction"}
        </button>
      </div>
    </form>
  );
}
