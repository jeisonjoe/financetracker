"use client";
import { supabase } from "@/app/supabase/supabase-client";
import { cFormat } from "@/app/utils/currencyFormat";
import { useEffect, useState } from "react";
import { BiChevronDown, BiSolidBank } from "react-icons/bi";

export default function TransactionsWidget() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: tx, error } = await supabase
        .from("transactions")
        .select("*");

      if (!error) {
        const model = tx.map((txn) => {
          return {
            id: txn.id,
            type: txn.type,
            date: new Date(txn.created_at).toISOString().split("T")[0],
            amount: txn.amount,
            category: txn.transaction.category.name,
            wallet: txn.transaction.wallet.name,
            note: txn.transaction.note,
          };
        });
        setData(model);
      }
    };
    fetchData();
  }, []);

  const [filter, setFilter] = useState(null);
  const filtered = data.filter((t) => {
    if (!filter) return true;
    return t.type == filter;
  });

  const groupByDate = (data) => {
    return data.reduce((acc, d) => {
      const date = d.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(d);
      return acc;
    }, []);
  };

  const groupedData = groupByDate(filtered);

  const handleBtnClick = (e) => {
    if (filter && filter == e.target.dataset.btnAction) {
      setFilter(null);
      return;
    }
    setFilter(e.target.dataset.btnAction);
  };

  return (
    <div className="grow flex flex-col gap-2 bg-white rounded-lg p-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6 text-lg text-sec-96">
          <button
            className={
              `${filter && filter == "income" ? "text-amount-primary" : ""} ` +
              " cursor-pointer"
            }
            data-btn-action="income"
            onClick={(e) => handleBtnClick(e)}
          >
            Income
          </button>
          <button
            className={
              `${filter && filter == "expense" ? "text-amount-primary" : ""} ` +
              " cursor-pointer"
            }
            data-btn-action="expense"
            onClick={(e) => handleBtnClick(e)}
          >
            Expenses
          </button>
        </div>
        <button className="flex gap-2 items-center text-sec-96 bg-app-bg p-4 py-2 rounded-lg text-sm">
          This Month <BiChevronDown />
        </button>
      </div>

      <div className="px-2 overflow-auto">
        {Object.entries(groupedData).map(([date, items]) => {
          return (
            <div key={date} className="flex flex-col gap-3 py-4">
              <div className="text-sec-96 text-sm">{date}</div>
              <div className="flex flex-col">
                {items.map((item) => {
                  const className =
                    item.type == "income" ? "text-green-100" : "text-red-100";
                  const sign = item.type == "income" ? "+" : "-";
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between items-center w-full border-b border-b-zinc-100 py-4 gap-8"
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-lg bg-zinc-400"></div>
                        <div className="flex flex-col">
                          <span className="text-sec-96 text-sm">
                            {item.category}
                          </span>
                          <span className="text-lg line-clamp-1">
                            {item.note}
                          </span>
                          <span className="text-sec-96 flex gap-1 items-center text-sm">
                            <BiSolidBank />
                            {item.wallet}
                          </span>
                        </div>
                      </div>

                      <div className={`${className} ` + "text-xl font-normal"}>
                        {sign}
                        {cFormat(item.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
