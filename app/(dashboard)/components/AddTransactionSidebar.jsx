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
import { BiTime } from "react-icons/bi";
import { toast } from "sonner";

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

export default function AddTransactionSidebar(props) {
  const { transaction, initialType, onSuccess } = props;
  const transactionTypes = ["expense", "income", "transfer"];
  const { isOpen, close, setProps } = useRhsSidebarStore();
  const { user } = useAuth();
  const currencySymbol = getCurrencySymbol(user?.currency || "INR");

  const { data: rawCategories = [] } = useCategoriesQuery();
  const { data: rawWallets = [] } = useWalletsQuery();
  const { createTransaction, updateTransaction } = useTransactionMutations();

  const categories = useMemo(
    () => rawCategories.map((c) => ({ key: c.name, name: c.name })),
    [rawCategories]
  );
  const wallets = useMemo(
    () => rawWallets.map((w) => ({ key: w.name, name: w.name })),
    [rawWallets]
  );

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

      const toWalRaw = transaction.to_wallet || transaction.full_transaction?.to_wallet;
      const toWalVal =
        typeof toWalRaw === "string"
          ? { key: toWalRaw, name: toWalRaw }
          : toWalRaw;
      setToWallet(toWalVal || {});
    } else {
      setData({
        amount: "",
        note: "",
        time: formatCurrentTime(),
        date: new Date(),
      });
      setType(initialType || "expense");
    }
  }, [transaction, initialType]);

  useEffect(() => {
    if (!transaction && categories.length > 0 && !category?.name) {
      setCategory(categories[0]);
    }
  }, [transaction, categories, category?.name]);

  useEffect(() => {
    if (!transaction && wallets.length > 0 && !wallet?.name) {
      setWallet(wallets[0]);
    }
    if (!transaction && wallets.length > 1 && !toWallet?.name) {
      const second = wallets.find((w) => w.name !== wallet?.name) || wallets[1];
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

  const handleSubmitData = async () => {
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
      },
    };

    try {
      const response = transaction
        ? await updateTransaction.mutateAsync({ id: transaction.id, payload })
        : await createTransaction.mutateAsync(payload);

      toast.success(
        transaction ? "Transaction updated" : "Transaction added successfully"
      );
      window.dispatchEvent(new CustomEvent("fintrack:transactions-updated"));
      if (onSuccess) onSuccess(response?.data);
      close();
    } catch (error) {
      toast.error(error.message || "Failed to save transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex bg-surface-elevated border border-white/[0.06] p-1 rounded-full self-start">
          {transactionTypes.map((btn) => (
            <button
              type="button"
              key={btn}
              onClick={() => setType(btn)}
              className={`px-5 py-2 rounded-full text-sm font-normal cursor-pointer capitalize transition-colors ${
                type === btn
                  ? type === "income"
                    ? "bg-green-10 text-green-100"
                    : "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {btn}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-zinc-500 pl-1">Amount</label>
          <div className="flex items-center gap-2">
            <span
              className={`text-3xl font-light ${
                type === "income" ? "text-green-100" : "text-zinc-300"
              }`}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              className={`w-full text-4xl font-light bg-transparent focus:outline-none placeholder:text-zinc-700 ${
                type === "income" ? "text-green-100" : "text-zinc-100"
              }`}
              value={data.amount}
              onChange={(e) => handleData("amount", e.target.value)}
              autoFocus={!transaction}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-normal text-zinc-500 pl-1">
            Description
          </label>
          <input
            type="text"
            className="w-full text-sm px-4 py-3 bg-surface-elevated border border-white/[0.06] rounded-xl focus:outline-none focus:border-white/20 transition-colors text-zinc-100 placeholder:text-zinc-600"
            placeholder="What is this for?"
            value={data.note}
            onChange={(e) => handleData("note", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {type === "transfer" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-normal text-zinc-500 pl-1">
                  From Wallet
                </label>
                <Dropdown
                  options={wallets}
                  placeholder="Select source"
                  value={wallet}
                  onChange={setWallet}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-normal text-zinc-500 pl-1">
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
                <label className="text-xs font-normal text-zinc-500 pl-1">
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
                <label className="text-xs font-normal text-zinc-500 pl-1">
                  Wallet
                </label>
                <Dropdown
                  options={wallets}
                  placeholder="Select"
                  value={wallet}
                  onChange={setWallet}
                />
              </div>
            </>
          )}
        </div>

        <div className="relative flex flex-col gap-1.5" ref={calendarRef}>
          <label className="text-xs font-normal text-zinc-500 pl-1">
            Date & time
          </label>
          <div
            className="w-full bg-surface-elevated border border-white/[0.06] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-surface-hover transition-colors"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <div className="flex items-center gap-2.5 text-zinc-200 text-sm font-normal">
              <BiTime className="text-zinc-500" size={18} />
              <span>
                {new Date(data.date || new Date()).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-zinc-700">|</span>
              <input
                type="text"
                className="bg-transparent w-20 focus:outline-none cursor-pointer text-zinc-300"
                value={data.time || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleData("time", e.target.value)}
              />
            </div>
            <span className="text-xs text-zinc-400">
              {showCalendar ? "Hide" : "Change"}
            </span>
          </div>

          {showCalendar && (
            <div className="absolute top-full mt-2 right-0 w-72 p-2 bg-surface-elevated rounded-2xl shadow-dropdown-sm border border-white/[0.08] z-50">
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

      <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
        <button
          type="button"
          className="flex-1 py-3 bg-surface-elevated text-zinc-300 font-normal hover:bg-surface-hover rounded-full transition-colors cursor-pointer"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="flex-1 py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-full transition-colors cursor-pointer disabled:opacity-60"
          onClick={handleSubmitData}
          disabled={isLoading}
        >
          {isLoading
            ? "Saving..."
            : transaction
            ? "Save Changes"
            : "Add Transaction"}
        </button>
      </div>
    </div>
  );
}
