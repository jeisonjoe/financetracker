"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import { TransactionApi } from "@/app/services/ApiClient";
import { cFormat } from "@/app/utils/currencyFormat";

export default function ImportPage() {
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [lastError, setLastError] = useState(null);
  const [busy, setBusy] = useState(false);

  const { user, isLoading } = useAuth();
  const currency = user?.currency || "INR";

  const fetchParsedData = async () => {
    setBusy(true);
    setStatus("Parsing Google Pay activity...");
    setLastError(null);
    try {
      const data = await TransactionApi.previewImport();
      setTransactions(data.transactions || []);
      setStatus(`Loaded ${data.count} transactions. Ready to import.`);
    } catch (e) {
      setLastError(e.message);
      setStatus("Failed to load data");
    } finally {
      setBusy(false);
    }
  };

  const startImport = async () => {
    if (!user || transactions.length === 0) return;
    setBusy(true);
    setStatus("Importing transactions...");
    setLastError(null);

    const payload = transactions.map((tx) => ({
      amount: tx.amount,
      type: tx.type,
      created_at: tx.iso_date,
      transaction: {
        note: tx.note,
        category: { key: "Imported", name: "Imported" },
        wallet: { key: tx.wallet, name: tx.wallet },
        payee: tx.payee,
        external_id: tx.external_id,
        imported_at: new Date().toISOString(),
      },
    }));

    try {
      const result = await TransactionApi.bulkSave(payload);
      setStatus(
        `Completed. Imported: ${result.imported}, Updated: ${result.updated}`
      );
      if (result.firstError) {
        setLastError(`Some items failed. First error: ${result.firstError}`);
      }
    } catch (e) {
      setLastError(e.message);
      setStatus("Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-app-bg min-h-screen text-ink-primary">
      <div className="max-w-5xl mx-auto bg-surface p-6 sm:p-8 rounded-3xl border border-line-subtle flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-ink-primary">
              Import Google Pay Transactions
            </h1>
            <p className="text-sm text-ink-subtle mt-1">
              Preview and deduplicate entries from your activity export.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-line-subtle rounded-full text-sm text-ink-secondary transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated border border-line-faint flex flex-wrap items-center justify-between gap-4 text-sm">
          <div>
            <span className="text-ink-subtle">Signed in as: </span>
            <span className="font-normal text-ink-secondary">
              {isLoading ? (
                "Loading..."
              ) : user ? (
                user.email
              ) : (
                <Link href="/" className="text-ink-primary underline">
                  Sign in to import
                </Link>
              )}
            </span>
          </div>
          <div>
            <span className="text-ink-subtle">Status: </span>
            <span className="font-medium text-ink-secondary">{status}</span>
          </div>
        </div>

        {lastError && (
          <div className="p-3.5 bg-red-10 text-red-100 text-sm rounded-xl whitespace-pre-wrap">
            {lastError}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchParsedData}
            disabled={busy || !user}
            className="px-5 py-2.5 bg-surface-elevated hover:bg-surface-hover border border-line text-ink-secondary rounded-full text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            1. Load Data
          </button>
          <button
            type="button"
            onClick={startImport}
            disabled={busy || transactions.length === 0 || !user}
            className="px-5 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            2. Start Import
          </button>
        </div>

        {transactions.length > 0 && (
          <div className="border border-line-subtle rounded-2xl overflow-hidden bg-surface-elevated/40">
            <div className="bg-surface-elevated px-4 py-3 text-sm font-normal text-ink-body border-b border-line-subtle">
              Preview ({transactions.length} items)
            </div>
            <div className="max-h-[480px] overflow-auto scrollbar-minimal">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-ink-subtle bg-surface border-b border-line-subtle sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-normal">Date</th>
                    <th className="px-4 py-3 font-normal">Details</th>
                    <th className="px-4 py-3 font-normal">Amount</th>
                    <th className="px-4 py-3 font-normal">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr
                      key={tx.external_id || i}
                      className="border-b border-line-faint last:border-b-0 hover:bg-tint-subtle"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                        {tx.date}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-normal text-ink-secondary">{tx.note}</div>
                        <div className="text-xs text-ink-subtle mt-0.5">
                          Wallet: {tx.wallet} • Payee: {tx.payee}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 font-medium whitespace-nowrap ${
                          tx.type === "income" ? "text-green-100" : "text-red-100"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {cFormat(tx.amount, { currency })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-subtle">
                        {tx.external_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
