"use client";
import { supabase } from "@/app/supabase/supabase-client";
import { cFormat } from "@/app/utils/currencyFormat";
import { useEffect, useState } from "react";
import { BiChevronDown, BiSolidBank, BiTrash, BiEdit, BiCheck, BiX } from "react-icons/bi";

const PAGE_SIZE = 20;

export default function TransactionsWidget() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState(null);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ note: "", wallet: "" });

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
          payee: txn.transaction?.payee || "",
          full_transaction: txn.transaction || {} // Keep full ref for updates
        };
      });

      setData((prev) => isNewFilter ? model : [...prev, ...model]);
    } else {
      console.error("Fetch error:", error);
    }
    setLoading(false);
  };

  // Delete Handler
  const deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setData(prev => prev.filter(item => item.id !== id));
    } else {
      alert("Failed to delete");
    }
  };

  // Edit Handlers
  const startEditing = (item) => {
    // Use payee as primary note for editing if available, else note
    const displayNote = item.payee && item.payee !== 'Unknown' && item.payee !== 'Transfer' ? item.payee : item.note;

    setEditingId(item.id);
    setEditForm({
      note: displayNote,
      wallet: item.wallet
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ note: "", wallet: "" });
  };

  const saveEditing = async (item) => {
    // Construct new transaction JSON
    // We update payee/note and wallet.
    // If we are editing 'note/payee', we essentially update both or decide based on context.
    // For simplicity, let's update 'payee' to the new text if it's a person, or 'note' if description.
    // To keep it simple: We update 'payee' property and 'note' property to be consistent?
    // Actually, 'note' usually holds the raw description or full text. 'payee' holds extracted name.
    // Let's update 'payee' to the new value.

    const updatedJson = {
      ...item.full_transaction,
      payee: editForm.note, // We assume user edits the "Title" which maps to Payee
      wallet: { ...item.full_transaction.wallet, name: editForm.wallet } // Handle wallet object structure if deep, or just name if simple
    };

    // Handle simple wallet string if it was simple
    if (typeof item.full_transaction.wallet === 'string') {
      updatedJson.wallet = editForm.wallet;
    } else {
      // Ensure structure exists
      updatedJson.wallet = {
        ...(item.full_transaction.wallet || {}),
        name: editForm.wallet
      };
    }

    const { error } = await supabase
      .from('transactions')
      .update({ transaction: updatedJson })
      .eq('id', item.id);

    if (!error) {
      // Update local state
      setData(prev => prev.map(d => {
        if (d.id === item.id) {
          return {
            ...d,
            payee: editForm.note,
            note: editForm.note, // Sync for display fallback
            wallet: editForm.wallet,
            full_transaction: updatedJson
          };
        }
        return d;
      }));
      setEditingId(null);
    } else {
      alert("Failed to update");
      console.error(error);
    }
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
                  const isEditing = editingId === item.id;

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

                        <div className="flex flex-col min-w-0 gap-0.5 w-full pr-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.note}
                              onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                              className="border border-gray-300 rounded px-2 py-1 text-sm w-full mb-1"
                              placeholder="Payee / Description"
                            />
                          ) : (
                            <span className="text-gray-900 font-semibold text-base truncate" title={item.note}>
                              {title}
                            </span>
                          )}

                          {isEditing ? (
                            <select
                              value={editForm.wallet}
                              onChange={(e) => setEditForm({ ...editForm, wallet: e.target.value })}
                              className="border border-gray-300 rounded px-2 py-0.5 text-xs w-full max-w-[150px]"
                            >
                              <option value="Unknown">Select Wallet...</option>
                              <option value="HDFC Debit Card">HDFC Debit Card</option>
                              <option value="SBI Debit Card">SBI Debit Card</option>
                              <option value="Cash">Cash</option>
                              <option value="Google Pay">Google Pay</option>
                            </select>
                          ) : (
                            <span className="text-gray-400 flex gap-1.5 items-center text-xs">
                              <span className="uppercase tracking-wide text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                {item.wallet.replace('Debit Card', 'Card')}
                              </span>
                              {item.category !== 'Uncategorized' && (
                                <span className="text-gray-300">• {item.category}</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`text-right flex flex-col justify-center items-end`}>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={() => saveEditing(item)} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><BiCheck size={18} /></button>
                            <button onClick={cancelEditing} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"><BiX size={18} /></button>
                          </div>
                        ) : (
                          <>
                            <span className={`${className} text-lg font-bold whitespace-nowrap group-hover:hidden`}>
                              {sign} {cFormat(item.amount)}
                            </span>
                            <div className="hidden group-hover:flex gap-2 animate-fadeIn">
                              <button
                                onClick={() => startEditing(item)}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                title="Edit"
                              >
                                <BiEdit size={18} />
                              </button>
                              <button
                                onClick={() => deleteTransaction(item.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete"
                              >
                                <BiTrash size={18} />
                              </button>
                            </div>
                          </>
                        )}
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
