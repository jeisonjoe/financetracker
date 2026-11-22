"use client";

import { useMemo, useState } from "react";
import { BiCheckCircle, BiEdit, BiPlus, BiRevision, BiTransfer, BiTrash, BiWallet } from "react-icons/bi";
import { toast } from "sonner";
import { formatAmountParts, cFormat } from "@/app/utils/currencyFormat";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  useAnalytics,
  useTransactionMutations,
  useWalletMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import { useGlobalPeriod } from "@/app/store/PeriodStore";
import AddTransactionSidebar from "../../components/AddTransactionSidebar";
import ActionModal from "@/app/components/ActionModal";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";

const WALLET_TYPE_OPTIONS = [
  { key: "debit", name: "Debit" },
  { key: "credit", name: "Credit" },
  { key: "cash", name: "Cash" },
  { key: "digital", name: "Digital / UPI" },
];

const EMPTY_WALLET_FORM = {
  name: "",
  type: "debit",
  opening_balance: "",
  credit_limit: "",
  statement_day: "",
  due_day: "",
};

export default function Page() {
  const { period } = useGlobalPeriod();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_WALLET_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "debit",
    opening_balance: "0",
    credit_limit: "",
    statement_day: "",
    due_day: "",
  });

  // Balance reconciliation state
  const [reconcileTarget, setReconcileTarget] = useState(null);
  const [reconcileActual, setReconcileActual] = useState("");
  const [reconciling, setReconciling] = useState(false);

  const { user } = useAuth();
  const { open } = useRhsSidebarStore();
  const currency = user?.currency || "INR";

  const { data: analytics, isLoading } = useAnalytics(period);
  const { data: registeredWallets = [] } = useWalletsQuery();
  const { createWallet, updateWallet, deleteWallet } = useWalletMutations();
  const { createTransaction } = useTransactionMutations();

  const analyticsByName = new Map(
    (analytics?.wallets || []).map((w) => [w.name, w])
  );

  const combinedWallets = useMemo(
    () =>
      registeredWallets.map((w) => {
        const stats = analyticsByName.get(w.name) || {};
        return {
          ...w,
          opening_balance: Number(w.opening_balance ?? stats.openingBalance ?? 0),
          balance: stats.balance ?? Number(w.opening_balance ?? 0),
          earned: stats.earned ?? 0,
          spent: stats.spent ?? 0,
          transferredIn: stats.transferredIn ?? 0,
          transferredOut: stats.transferredOut ?? 0,
          transactionCount: stats.transactionCount ?? 0,
          credit_limit: Number(w.credit_limit ?? stats.creditLimit ?? 0),
          statement_day: w.statement_day ?? stats.statementDay ?? null,
          due_day: w.due_day ?? stats.dueDay ?? null,
          creditUtilization: stats.creditUtilization ?? 0,
          availableCredit: stats.availableCredit ?? 0,
        };
      }),
    [registeredWallets, analytics?.wallets]
  );

  const totals = useMemo(
    () =>
      combinedWallets.reduce(
        (acc, w) => ({
          balance: acc.balance + (Number(w.balance) || 0),
          earned: acc.earned + (Number(w.earned) || 0),
          spent: acc.spent + (Number(w.spent) || 0),
        }),
        { balance: 0, earned: 0, spent: 0 }
      ),
    [combinedWallets]
  );

  const openCreateModal = () => {
    setCreateForm(EMPTY_WALLET_FORM);
    setCreateOpen(true);
  };

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Please enter a wallet name");
      return;
    }
    try {
      await createWallet.mutateAsync({
        name: createForm.name.trim(),
        type: createForm.type,
        opening_balance: Number(createForm.opening_balance) || 0,
        credit_limit: Number(createForm.credit_limit) || 0,
        statement_day: createForm.statement_day ? Number(createForm.statement_day) : null,
        due_day: createForm.due_day ? Number(createForm.due_day) : null,
      });
      toast.success(`Wallet "${createForm.name.trim()}" added`);
      setCreateOpen(false);
      setCreateForm(EMPTY_WALLET_FORM);
    } catch (err) {
      toast.error(err.message || "Failed to create wallet");
    }
  };

  const openEditModal = (wallet) => {
    setEditTarget(wallet);
    setEditForm({
      name: wallet.name,
      type: wallet.type || "debit",
      opening_balance: String(wallet.opening_balance ?? 0),
      credit_limit: wallet.credit_limit ? String(wallet.credit_limit) : "",
      statement_day: wallet.statement_day ? String(wallet.statement_day) : "",
      due_day: wallet.due_day ? String(wallet.due_day) : "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim()) {
      toast.error("Wallet name cannot be empty");
      return;
    }
    try {
      await updateWallet.mutateAsync({
        id: editTarget.id,
        payload: {
          name: editForm.name.trim(),
          type: editForm.type,
          opening_balance: Number(editForm.opening_balance) || 0,
          credit_limit: Number(editForm.credit_limit) || 0,
          statement_day: editForm.statement_day ? Number(editForm.statement_day) : null,
          due_day: editForm.due_day ? Number(editForm.due_day) : null,
        },
      });
      toast.success(`Updated "${editForm.name.trim()}"`);
      setEditTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to update wallet");
    }
  };

  const openReconcileModal = (wallet) => {
    setReconcileTarget(wallet);
    setReconcileActual(String(wallet.balance ?? 0));
  };

  const handleConfirmReconciliation = async () => {
    if (!reconcileTarget) return;
    const actual = Number(reconcileActual);
    if (!Number.isFinite(actual)) {
      toast.error("Please enter a valid amount");
      return;
    }
    const current = Number(reconcileTarget.balance) || 0;
    const diff = actual - current;
    if (diff === 0) {
      toast.info("Balance is already aligned. No adjustment needed.");
      setReconcileTarget(null);
      return;
    }
    setReconciling(true);
    try {
      const isPositive = diff > 0;
      await createTransaction.mutateAsync({
        type: isPositive ? "income" : "expense",
        amount: Math.abs(diff),
        created_at: new Date().toISOString(),
        transaction: {
          payee: "Balance Reconciliation",
          note: `Balance adjustment for ${reconcileTarget.name}`,
          category: { key: "Adjustment", name: "Adjustment" },
          wallet: { key: reconcileTarget.name, name: reconcileTarget.name },
          is_adjustment: true,
        },
      });
      toast.success(
        `Balance reconciled for "${reconcileTarget.name}" with a ${cFormat(Math.abs(diff), { currency })} adjustment`
      );
      setReconcileTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to reconcile balance");
    } finally {
      setReconciling(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWallet.mutateAsync(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
    } catch (err) {
      toast.error(err.message || "Failed to delete wallet");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* KPI Summary & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-elevated/50 p-5 rounded-2xl border border-line-subtle">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-ink-subtle">
              Net Worth ({combinedWallets.length}{" "}
              {combinedWallets.length === 1 ? "Wallet" : "Wallets"})
            </div>
            <div className="text-xl font-light text-ink-primary mt-0.5 tabular-nums">
              {cFormat(analytics?.summary?.netWorth ?? totals.balance, { currency })}
            </div>
          </div>

          {(analytics?.summary?.totalAssets !== undefined || analytics?.summary?.totalLiabilities !== undefined) && (
            <div className="hidden sm:flex items-center gap-4 text-xs tabular-nums">
              <div>
                <span className="text-ink-subtle">Assets: </span>
                <span className="text-ink-primary font-medium">
                  {cFormat(analytics?.summary?.totalAssets ?? totals.balance, { currency })}
                </span>
              </div>
              {Number(analytics?.summary?.totalLiabilities) > 0 && (
                <div>
                  <span className="text-ink-subtle">Liabilities: </span>
                  <span className="text-red-100 font-medium">
                    {cFormat(analytics?.summary?.totalLiabilities, { currency })}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="h-8 w-px bg-line-subtle hidden sm:block" />

          <div>
            <div className="text-xs text-ink-subtle">Period Earned</div>
            <div className="text-base font-medium text-green-100 mt-0.5 tabular-nums">
              +{cFormat(totals.earned, { currency })}
            </div>
          </div>

          <div>
            <div className="text-xs text-ink-subtle">Period Spent</div>
            <div className="text-base font-medium text-red-100 mt-0.5 tabular-nums">
              -{cFormat(totals.spent, { currency })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {combinedWallets.length >= 2 && (
            <button
              type="button"
              onClick={() =>
                open(AddTransactionSidebar, { initialType: "transfer" })
              }
              className="px-4 py-2 rounded-full bg-surface border border-line hover:bg-surface-hover text-ink-secondary text-sm font-normal flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
            >
              <BiTransfer size={16} />
              Transfer
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
          >
            <BiPlus size={18} />
            Add Wallet
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 bg-surface-elevated rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : combinedWallets.length === 0 ? (
        <div className="bg-surface-elevated/40 rounded-2xl border border-line-subtle p-12 text-center flex flex-col items-center gap-3">
          <p className="text-ink-subtle text-sm">
            No wallets configured yet. Add your first wallet to start tracking balances.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <BiPlus size={18} />
            Add Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {combinedWallets.map((wallet, idx) => {
            const parts = formatAmountParts(wallet.balance, currency);
            const hasTransfers =
              wallet.transferredIn > 0 || wallet.transferredOut > 0;
            const isCredit = wallet.type === "credit";
            const util = wallet.creditUtilization || 0;

            return (
              <div
                key={wallet.id}
                style={{ animationDelay: `${Math.min(idx * 45, 240)}ms` }}
                className="animate-fade-up wallet-card-surface rounded-2xl border border-line hover:border-line-strong p-6 flex flex-col justify-between gap-5 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-tint text-ink-secondary flex items-center justify-center shrink-0">
                      <BiWallet size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-normal text-ink-primary truncate">
                        {wallet.name}
                      </span>
                      <span className="text-xs text-ink-subtle capitalize">
                        {wallet.type} • {wallet.transactionCount} transactions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openReconcileModal(wallet)}
                      className="p-2 text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full transition-colors cursor-pointer"
                      title="Reconcile balance with bank/statement"
                    >
                      <BiRevision size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(wallet)}
                      className="p-2 text-ink-subtle hover:text-ink-primary hover:bg-tint rounded-full transition-colors cursor-pointer"
                      title="Edit wallet details"
                    >
                      <BiEdit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(wallet)}
                      className="p-2 text-ink-subtle hover:text-red-100 hover:bg-tint rounded-full transition-colors cursor-pointer"
                      title="Delete wallet"
                    >
                      <BiTrash size={16} />
                    </button>
                  </div>
                </div>

                {/* Credit Card Utilization & Info */}
                {isCredit && (wallet.credit_limit > 0 || wallet.statement_day || wallet.due_day) && (
                  <div className="flex flex-col gap-2 p-3 bg-surface rounded-xl border border-line-subtle text-xs">
                    {wallet.credit_limit > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-ink-subtle">
                          <span>Limit: {cFormat(wallet.credit_limit, { currency })}</span>
                          <span className={util > 70 ? "text-red-100 font-medium" : "text-ink-secondary"}>
                            {util}% used
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-tint overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              util > 70 ? "bg-red-100" : util > 30 ? "bg-accent" : "bg-green-100"
                            }`}
                            style={{ width: `${Math.min(100, util)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-ink-subtle">
                          Available credit: {cFormat(wallet.availableCredit, { currency })}
                        </div>
                      </div>
                    )}
                    {(wallet.statement_day || wallet.due_day) && (
                      <div className="flex items-center gap-3 text-[11px] text-ink-subtle pt-1 border-t border-line-subtle">
                        {wallet.statement_day && (
                          <span>Statement: Day {wallet.statement_day}</span>
                        )}
                        {wallet.due_day && (
                          <span>Due: Day {wallet.due_day}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(wallet.opening_balance !== 0 || hasTransfers) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-subtle tabular-nums">
                    {wallet.opening_balance !== 0 && (
                      <span>
                        Opening: {cFormat(wallet.opening_balance, { currency })}
                      </span>
                    )}
                    {hasTransfers && (
                      <span>
                        Transfers: +{cFormat(wallet.transferredIn, { currency })} / -
                        {cFormat(wallet.transferredOut, { currency })}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-end justify-between pt-3 border-t border-line-subtle">
                  <div className="flex flex-col">
                    <span className="text-xs text-ink-subtle">Current Balance</span>
                    <div className="flex items-baseline text-ink-primary mt-0.5 tabular-nums">
                      <span className="text-sm text-ink-muted mr-0.5">
                        {parts.sign}
                        {parts.symbol}
                      </span>
                      <span className="text-2xl font-light">{parts.whole}</span>
                      <span className="text-xs text-ink-subtle ml-0.5">
                        .{parts.decimal}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-right tabular-nums">
                    <div>
                      <div className="text-xs text-ink-subtle">Spent</div>
                      <div className="text-sm font-medium text-red-100">
                        -{cFormat(wallet.spent, { currency })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-subtle">Earned</div>
                      <div className="text-sm font-medium text-green-100">
                        +{cFormat(wallet.earned, { currency })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Wallet Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Wallet"
        subtitle="Create a bank account, credit card, cash, or UPI wallet."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateWallet} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Wallet Name</label>
            <input
              type="text"
              placeholder="e.g. HDFC Savings or UPI"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
              }
              autoFocus
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none focus:border-line-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Type</label>
              <Dropdown
                options={WALLET_TYPE_OPTIONS}
                value={createForm.type}
                onChange={(opt) =>
                  setCreateForm((prev) => ({ ...prev, type: opt.key }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Opening Balance</label>
              <input
                type="number"
                placeholder="0"
                value={createForm.opening_balance}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    opening_balance: e.target.value,
                  }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary placeholder:text-ink-placeholder tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>
          </div>

          {createForm.type === "credit" && (
            <div className="flex flex-col gap-3 pt-2 border-t border-line-subtle">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-subtle">Credit Limit</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={createForm.credit_limit}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, credit_limit: e.target.value }))
                  }
                  className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-subtle">Statement Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 15"
                    value={createForm.statement_day}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, statement_day: e.target.value }))
                    }
                    className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-subtle">Due Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 5"
                    value={createForm.due_day}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, due_day: e.target.value }))
                    }
                    className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createWallet.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {createWallet.isPending ? "Adding..." : "Add Wallet"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Wallet Modal */}
      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit Wallet Details"
        subtitle="Update wallet name, account type, credit limits, or starting balance."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Wallet Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Type</label>
              <Dropdown
                options={WALLET_TYPE_OPTIONS}
                value={editForm.type}
                onChange={(opt) =>
                  setEditForm((prev) => ({ ...prev, type: opt.key }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Opening Balance</label>
              <input
                type="number"
                value={editForm.opening_balance}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    opening_balance: e.target.value,
                  }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>
          </div>

          {editForm.type === "credit" && (
            <div className="flex flex-col gap-3 pt-2 border-t border-line-subtle">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-subtle">Credit Limit</label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={editForm.credit_limit}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, credit_limit: e.target.value }))
                  }
                  className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-subtle">Statement Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 15"
                    value={editForm.statement_day}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, statement_day: e.target.value }))
                    }
                    className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-subtle">Due Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 5"
                    value={editForm.due_day}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, due_day: e.target.value }))
                    }
                    className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateWallet.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {updateWallet.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reconcile Balance Modal */}
      <Modal
        isOpen={Boolean(reconcileTarget)}
        onClose={() => setReconcileTarget(null)}
        title={`Reconcile Balance: ${reconcileTarget?.name || ""}`}
        subtitle="Compare your recorded balance with your actual bank/statement balance."
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3.5 bg-surface rounded-xl border border-line-subtle text-sm">
            <span className="text-ink-subtle">Currently Recorded Balance</span>
            <span className="font-medium text-ink-primary tabular-nums">
              {cFormat(reconcileTarget?.balance ?? 0, { currency })}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Actual Statement / Bank Balance</label>
            <input
              type="number"
              step="any"
              value={reconcileActual}
              onChange={(e) => setReconcileActual(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
            />
          </div>

          {reconcileActual !== "" && Number.isFinite(Number(reconcileActual)) && (
            <div className="p-3 bg-surface rounded-xl border border-line-subtle text-xs flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-ink-subtle">Adjustment Needed:</span>
                <span
                  className={`font-medium tabular-nums ${
                    Number(reconcileActual) - Number(reconcileTarget?.balance || 0) >= 0
                      ? "text-green-100"
                      : "text-red-100"
                  }`}
                >
                  {Number(reconcileActual) - Number(reconcileTarget?.balance || 0) >= 0 ? "+" : ""}
                  {cFormat(
                    Number(reconcileActual) - Number(reconcileTarget?.balance || 0),
                    { currency }
                  )}
                </span>
              </div>
              <p className="text-[11px] text-ink-subtle">
                A balance adjustment transaction will be recorded to bring your balance to the exact amount.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReconcileTarget(null)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReconciliation}
              disabled={reconciling || reconcileActual === ""}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {reconciling ? "Reconciling..." : "Confirm & Adjust"}
            </button>
          </div>
        </div>
      </Modal>

      <ActionModal
        isOpen={Boolean(deleteTarget)}
        content={`Delete wallet "${deleteTarget?.name}"? Existing transactions referencing it will remain intact.`}
        primaryBtnText="Delete"
        secBtnText="Cancel"
        primaryAction={confirmDelete}
        secAction={() => setDeleteTarget(null)}
      />
    </div>
  );
}
