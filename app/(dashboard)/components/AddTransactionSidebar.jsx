"use client";

import Calendar from "@/app/components/Calender";
import Dropdown from "@/app/components/Dropdown";
import RhsSidebar from "@/app/components/RhsSidebar";
import { useAuth } from "@/app/contexts/AuthContext";
// import categories from "@/app/data/categories";
import wallets from "@/app/data/wallets";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { fetchCategories, useCategories } from "@/app/supabase/categories";
import { supabase } from "@/app/supabase/supabase-client";
import { useEffect, useState } from "react";
import { BiRupee, BiTime, BiX } from "react-icons/bi";
import { toast } from "sonner";

export default function AddTransactionSidebar() {
  const date = new Date();
  let hr = date.getHours();
  let ampm = hr > 12 ? "PM" : "AM";
  hr = hr >= 12 ? hr - 12 : hr == 0 ? 12 : hr;
  const dateStr =
    hr.toString().padStart(2, 0) +
    " : " +
    date.getMinutes().toString().padStart(2, 0) +
    " " +
    ampm;

  const incomeExpense = ["expense", "income"];

  const [isLoading, setIsLoading] = useState(false);
  // const [categories, setCategories] = useState([]);
  const { categories, isLoading: categoriesLoading, error } = useCategories();
  const [category, setCategory] = useState(categories?.[0] || {});
  const [wallet, setWallet] = useState(wallets?.[0] || {});
  const [data, setData] = useState({});
  const [type, setType] = useState(incomeExpense[0]);
  const { isOpen, close, setProps } = useRhsSidebarStore();
  const { user } = useAuth();

  useEffect(() => {
    setData({
      time: dateStr,
    });
  }, []);

  const handleData = (key, val) => {
    setData((prev) => {
      return {
        ...prev,
        [key]: val,
      };
    });
  };

  const handleSubmitData = async () => {
    setIsLoading(true);
    if (!user) {
      return;
    }
    if (!data.amount) {
      setIsLoading(false);
      return;
    }
    const record = {
      transaction: {
        note: data.note,
        time: data.time,
        category,
        wallet,
      },
      amount: data.amount,
      type: type,
      user_id: user.id,
    };
    const { error } = await supabase
      .from("transactions")
      .insert(record)
      .single();
    if (error) {
      console.error(error.message);
    }
    toast.success("Transaction added successfully");
    close();
    setData({});
    setIsLoading(false);
  };

  const handleClose = () => {
    if (isLoading) return;
    close();
  };

  useEffect(() => {
    setProps({ onclose: handleClose, title: "Add Transaction" });
  }, [isOpen]);

  useEffect(() => {
    if (!user) {
      return;
    }
  }, [user]);

  return (
    <>
      {/* form */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 p-1 w-full rounded-md bg-app-bg">
          {incomeExpense.map((btn, i) => {
            return (
              <div
                key={i}
                className={
                  `${type == btn ? "text-white bg-accent" : ""} ` +
                  "grow p-2 text-center capitalize rounded-md cursor-pointer"
                }
                data-type={btn}
                onClick={(e) => setType(e.target.dataset.type)}
              >
                {btn}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 bg-app-bg py-3.5 rounded-lg text-gray-3a">
          <input
            type="text"
            className="grow text-base focus:outline-none"
            placeholder="Amount"
            value={data?.amount || ""}
            onInput={(e) => {
              const val = e.target.value;
              if (isNaN(val)) return;
              handleData("amount", Number(val));
            }}
          />
          <BiRupee size={18} stroke="1" className="text-gray-46" />
        </div>
        <div className="flex items-center justify-between px-6 bg-app-bg py-3.5 rounded-lg">
          <input
            type="text"
            className="grow text-base focus:outline-none"
            placeholder="What is this for?"
            autoCorrect="off"
            autoCapitalize="on"
            spellCheck="false"
            value={data?.note || ""}
            onInput={(e) => handleData("note", e.target.value)}
          />
        </div>
        <Dropdown
          options={categories}
          placeholder="Category"
          value={category}
          onChange={(cat) => setCategory(cat)}
        />
        <Dropdown
          options={wallets}
          placeholder="Wallet"
          value={wallet}
          onChange={(wal) => setWallet(wal)}
        />

        <div className="flex items-center px-6 bg-app-bg py-3.5 gap-2 rounded-lg">
          <BiTime size={18} stroke="1" className="text-gray-46" />
          <input
            type="text"
            className="grow focus:outline-none placeholder:uppercase"
            placeholder={dateStr}
            value={data?.time || dateStr}
            onChange={(e) => handleData("time", e.target.value)}
          />
        </div>

        <div className="flex flex-col px-6 bg-app-bg py-3.5 gap-2 rounded-lg">
          <Calendar
            value={date}
            onChange={(dat) => {
              handleData("date", dat);
            }}
          />
        </div>
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
          Add Transaction
        </button>
      </div>
    </>
  );
}
