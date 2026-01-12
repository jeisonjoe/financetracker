"use client";
import { cFormat } from "@/app/utils/currencyFormat";
import React, { useEffect, useState } from "react";
import { BiChevronDown, BiRupee } from "react-icons/bi";
import { supabase } from "@/app/supabase/supabase-client";

export default function WalletWidget() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletStats();
  }, []);

  const fetchWalletStats = async () => {
    try {
      // Fetch all transactions to calculate balances correctly
      // In a production app, we would use a database view or RPC for this
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("amount, type, created_at, transaction");

      if (error) throw error;

      const walletStats = {};
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      transactions.forEach((tx) => {
        // Safe navigation for wallet name
        const walletName = tx.transaction?.wallet?.name || tx.transaction?.wallet || "Cash";

        if (!walletStats[walletName]) {
          walletStats[walletName] = {
            name: walletName,
            balance: 0,
            spent: 0,
            earned: 0,
          };
        }

        const amount = Number(tx.amount) || 0;
        const txDate = new Date(tx.created_at);
        const isThisMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

        // Balance logic (All Time)
        if (tx.type === 'income') {
          walletStats[walletName].balance += amount;
        } else {
          walletStats[walletName].balance -= amount;
        }

        // Monthly Stats logic
        if (isThisMonth) {
          if (tx.type === 'income') {
            walletStats[walletName].earned += amount;
          } else {
            walletStats[walletName].spent += amount;
          }
        }
      });

      // Convert to array and sort (maybe prioritized specific wallets?)
      const walletArray = Object.values(walletStats).sort((a, b) => {
        // Put Cash/Banks first, others later
        const priority = ['SBI Debit Card', 'HDFC Debit Card', 'Cash'];
        const idxA = priority.indexOf(a.name);
        const idxB = priority.indexOf(b.name);
        if (idxA > -1 && idxB > -1) return idxA - idxB;
        if (idxA > -1) return -1;
        if (idxB > -1) return 1;
        return a.name.localeCompare(b.name);
      });

      setWallets(walletArray);
    } catch (e) {
      console.error("Error fetching wallet stats:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grow flex flex-col gap-2 bg-white rounded-lg p-6 h-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg text-card-title font-semibold">My Wallet</span>
        <button className="flex gap-2 items-center text-sec-96 bg-app-bg p-4 py-2 rounded-lg text-sm">
          This Month <BiChevronDown />
        </button>
      </div>

      <div className="px-2 overflow-auto custom-scrollbar flex-grow">
        {loading ? (
          <div className="flex flex-col gap-4 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-full bg-gray-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No wallet data found</div>
        ) : (
          wallets.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 border-b border-b-zinc-50 py-5 last-of-type:border-b-0"
            >
              <div className="text-wallet-item-title text-base font-medium text-gray-700">{item.name}</div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs text-sec-96 uppercase tracking-wider font-semibold">Balance</span>
                  <div className="flex items-center text-card-title">
                    <span className="text-2xl font-bold text-gray-800">
                      {cFormat(item.balance)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-sec-96 uppercase tracking-wider">Spent</span>
                    <div className="flex items-baseline text-red-500">
                      <span className="text-base font-semibold">
                        -{cFormat(item.spent)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-sec-96 uppercase tracking-wider">Earned</span>
                    <div className="flex items-baseline text-emerald-500">
                      <span className="text-base font-semibold">
                        +{cFormat(item.earned)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
