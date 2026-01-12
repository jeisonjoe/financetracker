"use client";
import { supabase } from "@/app/supabase/supabase-client";
import { cFormat } from "@/app/utils/currencyFormat";
import { useEffect, useState } from "react";
import { BiChevronDown, BiSolidBank } from "react-icons/bi";

const PAGE_SIZE = 20;

export default function TransactionsWidget() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState(null);

  const fetchData = async (pageIndex, isNewFilter = false) => {
    setLoading(true);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("transactions")
      .select("*")
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filter) {
      query = query.eq('type', filter);
    }

    const { data: tx, error } = await query;

    if (!error) {
      if (tx.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const model = tx.map((txn) => {
        return {
          id: txn.id,
          type: txn.type,
          original_date: new Date(txn.created_at),
          date: new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          amount: txn.amount,
          category: txn.transaction?.category?.name || "Uncategorized",
          wallet: txn.transaction?.wallet?.name || "Unknown",
          note: txn.transaction?.note || "",
          payee: txn.transaction?.payee || "", // Use payee if available
        };
      });

      setData((prev) => isNewFilter ? model : [...prev, ...model]);
    } else {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [filter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, false);
  };

  const groupByDate = (data) => {
    return data.reduce((acc, d) => {
      // Use full date string for grouping headers
      const date = d.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(d);
      return acc;
    }, []);
  };

  // We group *all* currently loaded data
  const groupedData = groupByDate(data);

  const handleBtnClick = (e) => {
    const action = e.target.dataset.btnAction;
    if (filter === action) {
      setFilter(null);
    } else {
      setFilter(action);
    }
  };

  return (
    <div className="grow flex flex-col gap-2 bg-white rounded-lg p-6 h-full min-h-[500px]">
      {/* Header code same... */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-6 text-lg text-sec-96">
          <button
            className={
              `${filter === "income" ? "text-amount-primary font-semibold border-b-2 border-amount-primary" : ""} ` +
              " cursor-pointer transition-all pb-1"
            }
            data-btn-action="income"
            onClick={handleBtnClick}
          >
            Income
          </button>
          <button
            className={
              `${filter === "expense" ? "text-amount-primary font-semibold border-b-2 border-amount-primary" : ""} ` +
              " cursor-pointer transition-all pb-1"
            }
            data-btn-action="expense"
            onClick={handleBtnClick}
          >
            Expenses
          </button>
        </div>
        <button className="flex gap-2 items-center text-sec-96 bg-app-bg p-4 py-2 rounded-lg text-sm">
          This Month <BiChevronDown />
        </button>
      </div>

      <div className="px-2 flex-grow overflow-auto custom-scrollbar">
        {Object.entries(groupedData).map(([date, items]) => {
          return (
            <div key={date} className="flex flex-col gap-3 py-4 animate-fadeIn">
              <div className="text-gray-400 text-xs font-bold tracking-wider uppercase sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                {date}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const isIncome = item.type === "income";
                  const className = isIncome ? "text-emerald-600" : "text-gray-900";
                  const sign = isIncome ? "+" : "-";

                  // Use payee as primary if available and not generic
                  let title = item.payee && item.payee !== 'Unknown' && item.payee !== 'Transfer' ? item.payee : item.note;
                  // If note is super long and payee is generic, truncate note
                  if (!item.payee && title.length > 50) title = title.substring(0, 50) + "...";

                  // If title is just "Paid ... using ...", try to clean it visually?
                  // The parser already cleaned it but sometimes note is still raw.

                  return (
                    <div
                      key={item.id}
                      className="group flex justify-between items-center w-full p-3 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                    >
                      <div className="flex gap-4 items-center flex-1 min-w-0">
                        {/* Dynamic Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                          {isIncome ? '↓' : '↑'}
                        </div>

                        <div className="flex flex-col min-w-0 gap-0.5">
                          <span className="text-gray-900 font-semibold text-base truncate" title={item.note}>
                            {title}
                          </span>
                          <span className="text-gray-400 flex gap-1.5 items-center text-xs">
                            <span className="uppercase tracking-wide text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                              {item.wallet.replace('Debit Card', 'Card')}
                            </span>
                            {item.category !== 'Uncategorized' && (
                              <span className="text-gray-300">• {item.category}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className={`text-right flex flex-col justify-center`}>
                        <span className={`${className} text-lg font-bold whitespace-nowrap`}>
                          {sign} {cFormat(item.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {data.length === 0 && !loading && (
          <div className="text-center py-10 text-gray-400">No transactions found.</div>
        )}

        <div className="py-6 text-center">
          {loading ? (
            <span className="text-gray-400 text-sm">Loading transactions...</span>
          ) : hasMore ? (
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Load More
            </button>
          ) : (
            <span className="text-gray-300 text-xs uppercase tracking-widest">End of List</span>
          )}
        </div>
      </div>
    </div>
  );
}
