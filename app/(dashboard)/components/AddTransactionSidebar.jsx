"use client";

import Calendar from "@/app/components/Calender";
import Dropdown from "@/app/components/Dropdown";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import {
  useCategoriesQuery,
  useTransactionMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { getCurrencySymbol } from "@/app/utils/currencyFormat";
import { useEffect, useMemo, useRef, useState } from "react";
import { BiCalendar, BiTime } from "react-icons/bi";
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
  const { transaction, initialType, onSuccess } = props;
  const transactionTypes = ["expense", "income", "transfer"];
  const { isOpen, close, setProps } = useRhsSidebarStore();
  const { user } = useAuth();
  const currencySymbol = getCurrencySymbol(user?.currency || "INR");

  const { data: rawCategories = [] } = useCategoriesQuery();
  const { data: rawWallets = [] } = useWalletsQuery();
  const { createTransaction, updateTransaction } = useTransactionMutations();

  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState(initialType || transactionTypes[0]);
  const [category, setCategory] = useState({});
  const [wallet, setWallet] = useState({});
  const [toWallet, setToWallet] = useState({});
  const [data, setData] = useState({
    amount: "",
    note: "",
    time: formatCurrentTime(),
    date: new Date(),
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  const [isSplit, setIsSplit] = useState(false);
  const [splitPerson, setSplitPerson] = useState("");
  const [splitType, setSplitType] = useState("lent");

  const categories = useMemo(() => {
    const filtered = rawCategories.filter((c) => {
      if (type === "income") return c.type === "income" || c.type === "both";
      if (type === "expense") return c.type === "expense" || c.type === "both";
      return true;
    });
    const source = filtered.length > 0 ? filtered : rawCategories;
    return source.map((c) => ({ key: c.name, name: c.name }));
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

      const catVal =
        typeof transaction.category === "string"
          ? { key: transaction.category, name: transaction.category }
          : transaction.category;
      setCategory(catVal || {});

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
      const meta = transaction.full_transaction || transaction.transaction || {};
      setIsSplit(Boolean(meta.is_split || transaction.is_split));
      setSplitPerson(meta.split_person || transaction.split_person || "");
      setSplitType(meta.split_type || transaction.split_type || (transaction.type === "income" ? "settlement" : "lent"));
    } else {
      setData({
        amount: "",
        note: "",
        time: formatCurrentTime(),
        date: new Date(),
      });
      setType(initialType || "expense");
      setIsSplit(false);
      setSplitPerson("");
      setSplitType("lent");
    }
  }, [transaction, initialType]);

  // Keep selected category aligned with the active transaction type
  useEffect(() => {
    if (type === "transfer" || categories.length === 0) return;
    const stillValid = categories.some((c) => c.name === category?.name);
    if (!transaction && (!category?.name || !stillValid)) {
      setCategory(categories[0]);
    }
  }, [transaction, type, categories, category?.name]);

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
        category: isTransfer ? { key: "Transfer", name: "Transfer" } : category,
        wallet,
        ...(isTransfer ? { to_wallet: toWallet } : {}),
        payee: data.note || (isTransfer ? transferLabel : ""),
        is_split: isSplit,
        split_person: isSplit && splitPerson ? splitPerson.trim() : null,
        split_type: isSplit ? splitType : null,
      },
    };

    try {
      const response = transaction
        ? await updateTransaction.mutateAsync({ id: transaction.id, payload })
        : await createTransaction.mutateAsync(payload);

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
                  Category
                </label>
                <Dropdown
                  options={categories}
                  placeholder="Select"
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
