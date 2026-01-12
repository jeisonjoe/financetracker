"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/app/supabase/supabase-client';

export default function ImportPage() {
    const [transactions, setTransactions] = useState([]);
    const [status, setStatus] = useState('Idle');
    const [lastError, setLastError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setCurrentUser(user);
        });
    }, []);

    const fetchParsedData = async () => {
        setStatus('Fetching & Parsing data...');
        setLastError(null);
        try {
            const res = await fetch('/api/import-data');
            const data = await res.json();

            if (data.error) {
                setLastError(data.error);
                setStatus('Failed to fetch data');
                return;
            }

            setTransactions(data.transactions || []);
            setStatus(`Loaded ${data.count} transactions. Ready to Import.`);
        } catch (e) {
            setLastError(e.message);
            setStatus('Error fetching data');
        }
    };

    const startImport = async () => {
        if (!currentUser) return;
        setStatus('Importing via Prisma...');

        // Prepare the payload
        const payload = transactions.map(tx => ({
            amount: tx.amount,
            type: tx.type,
            created_at: tx.iso_date,
            transaction: {
                note: tx.note,
                category: { name: "Imported" },
                wallet: { name: tx.wallet },
                payee: tx.payee,
                external_id: tx.external_id,
                imported_at: new Date().toISOString()
            }
        }));

        try {
            const res = await fetch('/api/save-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: payload, userId: currentUser.id })
            });
            const result = await res.json();

            if (result.error) {
                setLastError(result.error);
                setStatus('Full Import Failed');
            } else {
                setStatus(`Completed! Imported: ${result.imported}, Failed: ${result.failed}`);
                if (result.firstError) {
                    setLastError(`Some items failed. First error: ${result.firstError}`);
                }
            }
        } catch (e) {
            setLastError(e.message);
            setStatus('Network or Server Error');
        }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen text-gray-800 font-sans">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-sm">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Import Google Pay Transactions</h1>

                <div className="mb-6 space-y-2">
                    <p><strong>User:</strong> {currentUser ? currentUser.email : 'Loading...'}</p>
                    <p><strong>Status:</strong> <span className="font-medium text-blue-600">{status}</span></p>
                    {lastError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded font-mono whitespace-pre-wrap">
                            {lastError}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={fetchParsedData}
                        className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        1. Load Data
                    </button>
                    <button
                        onClick={startImport}
                        disabled={transactions.length === 0 || !currentUser}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        2. Start Import
                    </button>
                </div>

                {transactions.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-3 font-semibold border-b flex justify-between">
                            <span>Preview ({transactions.length} items)</span>
                        </div>
                        <div className="max-h-[500px] overflow-auto p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Details</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx, i) => (
                                        <tr key={i} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap">{tx.date}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{tx.note}</div>
                                                <div className="text-xs text-gray-500">
                                                    Wallet: {tx.wallet} | Payee: {tx.payee}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'income' ? '+' : '-'} ₹{tx.amount}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
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
