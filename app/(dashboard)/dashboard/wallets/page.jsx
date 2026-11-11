"use client";

import { useState } from "react";
import { BiEdit, BiPlus, BiTransfer, BiTrash, BiWallet } from "react-icons/bi";
import { toast } from "sonner";
import { formatAmountParts, cFormat } from "@/app/utils/currencyFormat";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  useAnalytics,
  useWalletMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import AddTransactionSidebar from "../../components/AddTransactionSidebar";
import PeriodSelector from "@/app/components/PeriodSelector";
import ActionModal from "@/app/components/ActionModal";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";

const WALLET_TYPE_OPTIONS = [
  { key: "debit", name: "Debit" },
  { key: "credit", name: "Credit" },
  { key: "cash", name: "Cash" },
  { key: "digital", name: "Digital / UPI" },
];

export default function Page() {
  const [period, setPeriod] = useState("this_month");
  const [name, setName] = useState("");
  const [type, setType] = useState("debit");
  const [openingBalance, setOpeningBalance] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "debit",
    opening_balance: "0",
  });

  const { user } = useAuth();
  const { open } = useRhsSidebarStore();
  const currency = user?.currency || "INR";

  const { data: analytics, isLoading } = useAnalytics(period);
  const { data: registeredWallets = [] } = useWalletsQuery();
  const { createWallet, updateWallet, deleteWallet } = useWalletMutations();

  const analyticsByName = new Map(
    (analytics?.wallets || []).map((w) => [w.name, w])
  );

  const combinedWallets = registeredWallets.map((w) => {
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
    };
  });

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a wallet name");
      return;
    }
    try {
      await createWallet.mutateAsync({
        name: name.trim(),
        type,
        opening_balance: Number(openingBalance) || 0,
      });
      toast.success(`Wallet "${name.trim()}" added`);
      setName("");
      setOpeningBalance("");
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
        },
      });
      toast.success(`Updated "${editForm.name.trim()}"`);
      setEditTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to update wallet");
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-elevated/50 p-5 rounded-2xl border border-white/[0.06]">
        <form
          onSubmit={handleCreateWallet}
          className="flex flex-wrap items-center gap-3 grow"
        >
          <input
            type="text"
            placeholder="New stream name (e.g. HDFC Credit)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-surface border border-white/[0.06] text-sm text-zinc-100 placeholder:text-zinc-600 px-4 py-2.5 rounded-full focus:outline-none focus:border-white/20 grow min-w-[180px] transition-colors"
          />
          <input
            type="number"
            placeholder="Opening balance"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="bg-surface border border-white/[0.06] text-sm text-zinc-100 placeholder:text-zinc-600 px-4 py-2.5 rounded-full tabular-nums focus:outline-none focus:border-white/20 w-40 transition-colors"
          />
          <div className="w-36">
            <Dropdown
              options={WALLET_TYPE_OPTIONS}
              value={type}
              onChange={(opt) => setType(opt.key)}
              triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-white/[0.06] hover:bg-surface-hover text-sm text-zinc-300 px-4 py-2.5 rounded-full focus:outline-none cursor-pointer transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={createWallet.isPending}
            className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
          >
            <BiPlus size={18} />
            Add Stream
          </button>
        </form>

        <div className="flex items-center gap-3">
          {combinedWallets.length >= 2 && (
            <button
              type="button"
              onClick={() =>
                open(AddTransactionSidebar, { initialType: "transfer" })
              }
              className="px-4 py-2.5 rounded-full bg-surface border border-white/[0.08] hover:bg-surface-hover text-zinc-200 text-sm font-normal flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
            >
              <BiTransfer size={16} />
              Transfer Funds
            </button>
          )}
          <PeriodSelector value={period} onChange={setPeriod} />
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
        <div className="bg-surface-elevated/40 rounded-2xl border border-white/[0.06] p-12 text-center text-zinc-500 text-sm">
          No wallets configured yet. Add one above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {combinedWallets.map((wallet, idx) => {
            const parts = formatAmountParts(wallet.balance, currency);
            const hasTransfers =
              wallet.transferredIn > 0 || wallet.transferredOut > 0;
            return (
              <div
                key={wallet.id}
                style={{ animationDelay: `${Math.min(idx * 45, 240)}ms` }}
                className="animate-fade-up bg-gradient-to-br from-[#1C1B22] to-[#121215] rounded-2xl border border-white/[0.07] hover:border-white/[0.14] p-6 flex flex-col justify-between gap-5 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] text-zinc-200 flex items-center justify-center shrink-0">
                      <BiWallet size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base font-normal text-zinc-100 truncate">
                        {wallet.name}
                      </span>
                      <span className="text-xs text-zinc-500 capitalize">
                        {wallet.type} • {wallet.transactionCount} transactions
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(wallet)}
                      className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer"
                      title="Edit wallet & opening balance"
                    >
                      <BiEdit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(wallet)}
                      className="p-2 text-zinc-500 hover:text-red-100 hover:bg-white/[0.06] rounded-full transition-colors cursor-pointer"
                      title="Delete wallet"
                    >
                      <BiTrash size={16} />
                    </button>
                  </div>
                </div>

                {(wallet.opening_balance !== 0 || hasTransfers) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 tabular-nums">
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

                <div className="flex items-end justify-between pt-3 border-t border-white/[0.06]">
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500">Current Balance</span>
                    <div className="flex items-baseline text-zinc-100 mt-0.5 tabular-nums">
                      <span className="text-sm text-zinc-400 mr-0.5">
                        {parts.sign}
                        {parts.symbol}
                      </span>
                      <span className="text-2xl font-light">{parts.whole}</span>
                      <span className="text-xs text-zinc-500 ml-0.5">
                        .{parts.decimal}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-right tabular-nums">
                    <div>
                      <div className="text-xs text-zinc-500">Spent</div>
                      <div className="text-sm font-medium text-red-100">
                        -{cFormat(wallet.spent, { currency })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Earned</div>
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

      <Modal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit Stream Details"
        subtitle="Update stream name, account type, or starting balance."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Stream Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="bg-surface-elevated border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Type</label>
              <Dropdown
                options={WALLET_TYPE_OPTIONS}
                value={editForm.type}
                onChange={(opt) =>
                  setEditForm((prev) => ({ ...prev, type: opt.key }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Opening Balance</label>
              <input
                type="number"
                value={editForm.opening_balance}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    opening_balance: e.target.value,
                  }))
                }
                className="bg-surface-elevated border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 tabular-nums focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-zinc-300 hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateWallet.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {updateWallet.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
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
