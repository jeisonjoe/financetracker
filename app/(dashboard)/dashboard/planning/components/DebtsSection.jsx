"use client";

import { useMemo, useState } from "react";
import {
  BiCheckCircle,
  BiHistory,
  BiPlus,
  BiSearch,
  BiTimeFive,
  BiUser,
  BiUserCheck,
} from "react-icons/bi";
import { toast } from "sonner";
import { cFormat } from "@/app/utils/currencyFormat";
import {
  usePlanningMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import AddTransactionSidebar from "@/app/(dashboard)/components/AddTransactionSidebar";
import DebtsBarChart from "@/app/components/charts/DebtsBarChart";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";
import DatePicker from "@/app/components/DatePicker";

export default function DebtsSection({ planning, currency }) {
  const debts = useMemo(() => {
    const raw = planning?.debtsSummary || {};
    const rawContacts = raw.contacts || raw.byPerson || [];
    const normalizedContacts = rawContacts.map((c) => ({
      ...c,
      name: c.name || c.person || "Unknown",
    }));
    return {
      totalLent: raw.totalLent || 0,
      totalBorrowed: raw.totalBorrowed || 0,
      totalSettled: raw.totalSettled || 0,
      netBalance:
        raw.netBalance ?? (raw.totalLent || 0) - (raw.totalBorrowed || 0),
      contacts: normalizedContacts,
      openDebtsCount:
        raw.openDebtsCount ??
        normalizedContacts.filter((c) => c.balance !== 0).length,
      history:
        raw.history ||
        normalizedContacts
          .flatMap((p) =>
            (p.transactions || []).map((t) => ({
              ...t,
              person: p.name,
            }))
          )
          .sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  }, [planning?.debtsSummary]);

  const { recordRepayment } = usePlanningMutations();
  const { data: wallets = [] } = useWalletsQuery();
  const { open } = useRhsSidebarStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "owes_you" | "you_owe" | "settled"
  const [selectedContact, setSelectedContact] = useState(null);

  // Repayment Modal state
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [repayForm, setRepayForm] = useState({
    person: "",
    amount: "",
    wallet: wallets[0]?.name || "Cash",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const walletOptions = useMemo(
    () => wallets.map((w) => ({ key: w.name, name: w.name })),
    [wallets]
  );

  const filteredContacts = useMemo(() => {
    let list = debts.contacts || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list;
  }, [debts.contacts, search, statusFilter]);

  const historyList = useMemo(() => {
    let list = debts.history || [];
    if (selectedContact) {
      list = list.filter((h) => h.person?.toLowerCase() === selectedContact.toLowerCase());
    }
    return list;
  }, [debts.history, selectedContact]);

  const openRepayForContact = (contact) => {
    setRepayForm({
      person: contact.name,
      amount: contact.balance !== 0 ? String(Math.abs(contact.balance)) : "",
      wallet: wallets[0]?.name || "Cash",
      date: new Date().toISOString().slice(0, 10),
      note: `Repayment from ${contact.name}`,
    });
    setRepayModalOpen(true);
  };

  const handleSaveRepayment = async (e) => {
    e.preventDefault();
    if (!repayForm.person.trim()) {
      toast.error("Please specify a contact person");
      return;
    }
    const amount = Number(repayForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await recordRepayment.mutateAsync({
        person: repayForm.person.trim(),
        amount,
        wallet: repayForm.wallet || "Cash",
        date: repayForm.date || new Date().toISOString().slice(0, 10),
        note: repayForm.note.trim() || `Debt settlement with ${repayForm.person.trim()}`,
      });
      toast.success(`Recorded ${cFormat(amount, { currency })} settlement with ${repayForm.person.trim()}`);
      setRepayModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to record repayment");
    }
  };

  const handleAddNewDebt = () => {
    open(AddTransactionSidebar, {
      initialValues: {
        is_split: true,
        split_person: selectedContact || "",
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-elevated/50 p-5 rounded-2xl border border-line-subtle flex flex-col justify-between">
          <span className="text-xs text-ink-subtle">Net Balance</span>
          <div className="mt-2">
            <span
              className={`text-2xl font-light tabular-nums ${
                debts.netBalance > 0
                  ? "text-green-100 font-normal"
                  : debts.netBalance < 0
                  ? "text-red-100 font-normal"
                  : "text-ink-primary"
              }`}
            >
              {debts.netBalance >= 0 ? "+" : ""}
              {cFormat(debts.netBalance, { currency })}
            </span>
            <p className="text-xs text-ink-subtle mt-0.5">
              {debts.netBalance > 0
                ? "Others owe you in net"
                : debts.netBalance < 0
                ? "You owe others in net"
                : "All peer loans settled"}
            </p>
          </div>
        </div>

        <div className="bg-surface-elevated/50 p-5 rounded-2xl border border-line-subtle flex flex-col justify-between">
          <span className="text-xs text-ink-subtle">Total Lent (Receivable)</span>
          <div className="mt-2">
            <span className="text-2xl font-light text-green-100 tabular-nums">
              +{cFormat(debts.totalLent, { currency })}
            </span>
            <p className="text-xs text-ink-subtle mt-0.5">
              Money you gave to friends / family
            </p>
          </div>
        </div>

        <div className="bg-surface-elevated/50 p-5 rounded-2xl border border-line-subtle flex flex-col justify-between">
          <span className="text-xs text-ink-subtle">Total Borrowed (Payable)</span>
          <div className="mt-2">
            <span className="text-2xl font-light text-red-100 tabular-nums">
              -{cFormat(debts.totalBorrowed, { currency })}
            </span>
            <p className="text-xs text-ink-subtle mt-0.5">
              Money you received and owe back
            </p>
          </div>
        </div>

        <div className="bg-surface-elevated/50 p-5 rounded-2xl border border-line-subtle flex flex-col justify-between">
          <span className="text-xs text-ink-subtle">Open Debt Items</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-light text-ink-primary tabular-nums">
              {debts.openDebtsCount}
            </span>
            <button
              type="button"
              onClick={handleAddNewDebt}
              className="px-3 py-1 bg-cta text-cta-ink rounded-full text-xs font-medium flex items-center gap-1 hover:bg-cta-hover cursor-pointer transition-all"
            >
              <BiPlus size={14} />
              Add Loan/Split
            </button>
          </div>
          <p className="text-xs text-ink-subtle mt-0.5">
            Active balances pending settlement
          </p>
        </div>
      </div>

      {/* Main Grid: Contacts List & History Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Contacts Ledger */}
        <div className="lg:col-span-7 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-ink-primary">
                Contacts &amp; Counterparties
              </h3>
              <p className="text-xs text-ink-subtle mt-0.5">
                Outstanding balances with friends, family, and peers
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-surface border border-line-subtle rounded-full px-3 py-1 text-xs">
                <BiSearch className="text-ink-subtle" size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter contact..."
                  className="bg-transparent text-ink-primary placeholder:text-ink-placeholder focus:outline-none w-28"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter contacts by debt status"
                className="bg-surface border border-line-subtle rounded-full px-2.5 py-1 text-xs text-ink-secondary focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="owes_you">Owes You</option>
                <option value="you_owe">You Owe</option>
                <option value="settled">Settled</option>
              </select>
            </div>
          </div>

          {/* Counterparty Net Balances Visual Chart */}
          {debts.contacts?.some((c) => Math.abs(c.balance) > 0) && (
            <div className="p-3 bg-surface rounded-xl border border-line-subtle">
              <span className="text-xs text-ink-subtle block mb-2">
                Net Balance by Contact (Green = Owes You, Red = You Owe)
              </span>
              <DebtsBarChart contacts={debts.contacts} currency={currency} height={140} />
            </div>
          )}

          {filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-subtle">
              No contacts or active debts recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredContacts.map((contact) => {
                const isSelected = selectedContact === contact.name;
                const isOwed = contact.balance > 0;
                const isOwes = contact.balance < 0;
                const isSettled = contact.balance === 0;

                return (
                  <div
                    key={contact.name}
                    className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all ${
                      isSelected
                        ? "bg-surface-elevated border-line-strong shadow-xs"
                        : "bg-surface border-line-subtle hover:border-line"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer grow"
                      onClick={() =>
                        setSelectedContact((prev) =>
                          prev === contact.name ? null : contact.name
                        )
                      }
                    >
                      <div className="w-10 h-10 rounded-full bg-tint text-ink-secondary flex items-center justify-center shrink-0">
                        <BiUser size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-primary truncate">
                          {contact.name}
                        </div>
                        <div className="text-xs text-ink-subtle flex items-center gap-2 mt-0.5">
                          <span>Lent: {cFormat(contact.lent, { currency })}</span>
                          <span>•</span>
                          <span>Borrowed: {cFormat(contact.borrowed, { currency })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right tabular-nums">
                        <div
                          className={`text-sm font-medium ${
                            isOwed
                              ? "text-green-100"
                              : isOwes
                              ? "text-red-100"
                              : "text-ink-subtle"
                          }`}
                        >
                          {isOwed ? `+${cFormat(contact.balance, { currency })}` : ""}
                          {isOwes ? `-${cFormat(Math.abs(contact.balance), { currency })}` : ""}
                          {isSettled ? "Settled" : ""}
                        </div>
                        <span className="text-[11px] text-ink-subtle block">
                          {isOwed ? "Owes you" : isOwes ? "You owe" : "No balance"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openRepayForContact(contact)}
                        className="px-3 py-1.5 bg-tint hover:bg-tint-hover text-ink-primary text-xs rounded-full font-medium cursor-pointer transition-colors"
                      >
                        Repay / Settle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: History Timeline */}
        <div className="lg:col-span-5 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-ink-primary flex items-center gap-2">
                <BiHistory size={16} className="text-ink-subtle" />
                <span>Debt &amp; Loan Timeline</span>
              </h3>
              <p className="text-xs text-ink-subtle mt-0.5">
                {selectedContact
                  ? `Transactions with ${selectedContact}`
                  : "All debt allocations and settlements"}
              </p>
            </div>

            {selectedContact && (
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="text-xs text-ink-subtle hover:text-ink-primary underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>

          {historyList.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-subtle">
              No history found for this view.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {historyList.slice(0, 30).map((h) => {
                const isLent = h.role === "lent";
                const isSettlement = h.role === "settlement";
                return (
                  <div
                    key={h.id}
                    className="p-3 bg-surface rounded-xl border border-line-subtle flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-primary truncate">
                          {h.person || "Contact"}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSettlement
                              ? "bg-accent-soft text-accent"
                              : isLent
                              ? "bg-green-10 text-green-100"
                              : "bg-red-10 text-red-100"
                          }`}
                        >
                          {isSettlement ? "Settled" : isLent ? "Lent" : "Borrowed"}
                        </span>
                      </div>
                      <span className="text-ink-subtle truncate">
                        {h.note || (isSettlement ? "Settlement payment" : "Split loan")}
                      </span>
                      <span className="text-[11px] text-ink-faint">
                        {new Date(h.createdAt).toLocaleDateString()} • {h.wallet || "Cash"}
                      </span>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <span
                        className={`font-medium ${
                          isSettlement
                            ? "text-ink-secondary"
                            : isLent
                            ? "text-green-100"
                            : "text-red-100"
                        }`}
                      >
                        {isLent ? "+" : isSettlement ? "✓ " : "-"}
                        {cFormat(h.amount, { currency })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Record Repayment Modal */}
      <Modal
        isOpen={repayModalOpen}
        onClose={() => setRepayModalOpen(false)}
        title="Record Debt Settlement"
        subtitle="Log a repayment or settlement transaction for a contact."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveRepayment} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Contact / Person</label>
            <input
              type="text"
              value={repayForm.person}
              onChange={(e) =>
                setRepayForm((prev) => ({ ...prev, person: e.target.value }))
              }
              placeholder="e.g. Rahul or Priya"
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Amount</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={repayForm.amount}
                onChange={(e) =>
                  setRepayForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
                className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Settled Via Wallet</label>
              <Dropdown
                options={walletOptions}
                value={repayForm.wallet}
                onChange={(opt) =>
                  setRepayForm((prev) => ({ ...prev, wallet: opt.key }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Settlement Date</label>
            <input
              type="date"
              value={repayForm.date}
              onChange={(e) =>
                setRepayForm((prev) => ({ ...prev, date: e.target.value }))
              }
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Note (Optional)</label>
            <input
              type="text"
              value={repayForm.note}
              onChange={(e) =>
                setRepayForm((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="e.g. Paid via GPay"
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRepayModalOpen(false)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordRepayment.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {recordRepayment.isPending ? "Recording..." : "Record Settlement"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
