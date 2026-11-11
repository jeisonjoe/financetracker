"use client";

import { useState } from "react";
import {
  BiCheckCircle,
  BiEdit,
  BiPause,
  BiPlay,
  BiPlus,
  BiSkipNext,
  BiTrash,
} from "react-icons/bi";
import { toast } from "sonner";
import { cFormat } from "@/app/utils/currencyFormat";
import {
  useCategoriesQuery,
  usePlanningMutations,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import ActionModal from "@/app/components/ActionModal";
import DatePicker from "@/app/components/DatePicker";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";
import AnimatedNumber from "@/app/components/AnimatedNumber";

const EMPTY_FORM = {
  title: "",
  type: "expense",
  amount: "",
  frequency: "monthly",
  next_due_date: new Date().toISOString().slice(0, 10),
  category: "Bills & Utilities",
  wallet: "Cash",
  auto_reserve: true,
  notes: "",
};

const FREQUENCIES = [
  { key: "weekly", name: "Weekly" },
  { key: "biweekly", name: "Bi-weekly" },
  { key: "monthly", name: "Monthly" },
  { key: "quarterly", name: "Quarterly" },
  { key: "yearly", name: "Yearly" },
];

function getDueBadge(item) {
  if (!item.is_active) {
    return {
      label: "Paused",
      cls: "bg-white/[0.06] text-zinc-500",
      dot: "bg-zinc-500",
    };
  }
  const days = item.days_until_due;
  if (days < 0) {
    return {
      label: `${Math.abs(days)}d overdue`,
      cls: "bg-red-10 text-red-100",
      dot: "bg-red-100",
    };
  }
  if (days === 0) {
    return {
      label: "Due today",
      cls: "bg-accent/20 text-accent",
      dot: "bg-accent",
    };
  }
  if (days <= 7) {
    return {
      label: `In ${days}d`,
      cls: "bg-white/[0.08] text-zinc-200",
      dot: "bg-zinc-200",
    };
  }
  return {
    label: item.next_due_date,
    cls: "bg-white/[0.05] text-zinc-400",
    dot: "bg-zinc-500",
  };
}

export default function RecurringSection({ planning, currency }) {
  const {
    createRecurring,
    updateRecurring,
    processRecurring,
    deleteRecurring,
  } = usePlanningMutations();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: wallets = [] } = useWalletsQuery();

  const items = planning?.recurring || [];
  const summary = planning?.recurringSummary || {
    monthlyIncome: 0,
    monthlyExpense: 0,
    netMonthlyRecurring: 0,
    overdueCount: 0,
    dueSoonCount: 0,
  };

  const [filterMode, setFilterMode] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredItems = items.filter((item) => {
    if (filterMode === "due") {
      return item.is_active && item.days_until_due <= 7;
    }
    if (filterMode === "expense") return item.type === "expense";
    if (filterMode === "income") return item.type === "income";
    return true;
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...EMPTY_FORM,
      category: categories[0]?.name || "Bills & Utilities",
      wallet: wallets[0]?.name || "Cash",
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      type: item.type || "expense",
      amount: String(item.amount || ""),
      frequency: item.frequency || "monthly",
      next_due_date: item.next_due_date || new Date().toISOString().slice(0, 10),
      category: item.category || "Bills & Utilities",
      wallet: item.wallet || "Cash",
      auto_reserve: Boolean(item.auto_reserve),
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!Number(form.amount) || Number(form.amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    const payload = {
      title: form.title.trim(),
      type: form.type,
      amount: Number(form.amount),
      frequency: form.frequency,
      next_due_date: form.next_due_date,
      category: form.category,
      wallet: form.wallet,
      auto_reserve: form.auto_reserve,
      notes: form.notes.trim(),
    };

    try {
      if (editingItem) {
        await updateRecurring.mutateAsync({ id: editingItem.id, payload });
        toast.success(`Updated "${payload.title}"`);
      } else {
        await createRecurring.mutateAsync(payload);
        toast.success(`Scheduled "${payload.title}"`);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save recurring item");
    }
  };

  const handleProcess = async (item, action) => {
    try {
      await processRecurring.mutateAsync({ id: item.id, action });
      if (action === "log") {
        window.dispatchEvent(new CustomEvent("fintrack:transactions-updated"));
        toast.success(`Logged "${item.title}" & advanced due date`);
      } else {
        toast.success(`Skipped cycle for "${item.title}"`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to process cycle");
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateRecurring.mutateAsync({
        id: item.id,
        payload: { is_active: !item.is_active },
      });
      toast.success(
        item.is_active ? `Paused "${item.title}"` : `Resumed "${item.title}"`
      );
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecurring.mutateAsync(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.title}"`);
    } catch (err) {
      toast.error(err.message || "Failed to delete recurring item");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filterChips = [
    { key: "all", label: `All (${items.length})` },
    {
      key: "due",
      label: `Due Soon (${summary.overdueCount + summary.dueSoonCount})`,
    },
    { key: "expense", label: "Bills" },
    { key: "income", label: "Income" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Header */}
      <div className="bg-surface-elevated/50 border border-white/[0.06] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-zinc-500">Monthly Recurring Income</div>
            <div className="text-base font-medium text-green-100 mt-0.5">
              <AnimatedNumber
                value={summary.monthlyIncome}
                currency={currency}
                prefix="+"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Monthly Fixed Bills</div>
            <div className="text-base font-medium text-red-100 mt-0.5">
              <AnimatedNumber
                value={summary.monthlyExpense}
                currency={currency}
                prefix="-"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Net Monthly Recurring</div>
            <div
              className={`text-base font-medium mt-0.5 ${
                summary.netMonthlyRecurring < 0 ? "text-red-100" : "text-zinc-200"
              }`}
            >
              <AnimatedNumber
                value={summary.netMonthlyRecurring}
                currency={currency}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
        >
          <BiPlus size={18} />
          Add Schedule
        </button>
      </div>

      {/* Filter Pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filterChips.map((chip) => {
            const active = filterMode === chip.key;
            return (
              <button
                type="button"
                key={chip.key}
                onClick={() => setFilterMode(chip.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs cursor-pointer transition-all active:scale-[0.97] ${
                  active
                    ? "bg-white/[0.1] text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-surface-elevated/40 border border-white/[0.06] rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-400">
            {items.length === 0
              ? "Track rent, subscriptions, EMIs, and expected salary to keep committed cash clear."
              : "No recurring items match this filter."}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-2 rounded-full bg-surface-elevated hover:bg-surface-hover border border-white/[0.08] text-sm text-zinc-200 cursor-pointer transition-all active:scale-[0.97]"
            >
              Add your first recurring item
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredItems.map((item, idx) => {
            const badge = getDueBadge(item);
            const isIncome = item.type === "income";
            return (
              <div
                key={item.id}
                style={{ animationDelay: `${Math.min(idx * 35, 210)}ms` }}
                className="animate-fade-up bg-surface-elevated/50 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-normal text-zinc-100">
                        {item.title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] tabular-nums ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-zinc-500 capitalize">
                        {item.frequency}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {item.wallet} • {item.category}
                      {item.frequency !== "monthly"
                        ? ` • ~${cFormat(item.monthly_equivalent, { currency })}/mo`
                        : ""}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`text-base font-medium tabular-nums ${
                      isIncome ? "text-green-100" : "text-zinc-200"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {cFormat(item.amount, { currency })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.is_active && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleProcess(item, "log")}
                          disabled={processRecurring.isPending}
                          className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-white/[0.08] text-xs text-zinc-200 flex items-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          title="Log as transaction & advance due date"
                        >
                          <BiCheckCircle size={14} />
                          Log & Advance
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProcess(item, "skip")}
                          disabled={processRecurring.isPending}
                          className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] rounded-full cursor-pointer transition-colors"
                          title="Skip this cycle"
                        >
                          <BiSkipNext size={17} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] rounded-full cursor-pointer transition-colors"
                      title={item.is_active ? "Pause" : "Resume"}
                    >
                      {item.is_active ? <BiPause size={16} /> : <BiPlay size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] rounded-full cursor-pointer transition-colors"
                      title="Edit"
                    >
                      <BiEdit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-zinc-500 hover:text-red-100 hover:bg-white/[0.06] rounded-full cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <BiTrash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Recurring Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? "Edit Recurring Schedule" : "New Recurring Schedule"}
        subtitle="Schedule regular bills, subscriptions, or expected income."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex bg-surface-elevated border border-white/[0.06] p-1 rounded-full self-start">
            {["expense", "income"].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm((p) => ({ ...p, type: t }))}
                className={`px-5 py-1.5 rounded-full text-xs capitalize cursor-pointer transition-all ${
                  form.type === t
                    ? t === "income"
                      ? "bg-green-10 text-green-100"
                      : "bg-zinc-100 text-zinc-950"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Title</label>
              <input
                type="text"
                placeholder="e.g. House Rent or Salary"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                className="bg-surface-elevated border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Amount</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                className="bg-surface-elevated border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-100 tabular-nums focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Frequency</label>
              <Dropdown
                options={FREQUENCIES}
                value={form.frequency}
                onChange={(opt) => setForm((p) => ({ ...p, frequency: opt.key }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Next Due Date</label>
              <DatePicker
                value={form.next_due_date}
                onChange={(val) =>
                  setForm((p) => ({ ...p, next_due_date: val }))
                }
                placeholder="Select due date"
                align="right"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Category</label>
              <Dropdown
                options={categories.map((c) => ({ key: c.name, name: c.name }))}
                value={form.category}
                onChange={(opt) => setForm((p) => ({ ...p, category: opt.key }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500">Preferred Wallet</label>
              <Dropdown
                options={wallets.map((w) => ({ key: w.name, name: w.name }))}
                value={form.wallet}
                onChange={(opt) => setForm((p) => ({ ...p, wallet: opt.key }))}
              />
            </div>
          </div>

          {form.type === "expense" && (
            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_reserve}
                onChange={(e) =>
                  setForm((p) => ({ ...p, auto_reserve: e.target.checked }))
                }
                className="rounded accent-zinc-200"
              />
              Reserve this bill in my monthly committed cashflow plan
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-zinc-300 hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRecurring.isPending || updateRecurring.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {editingItem ? "Save Changes" : "Add Schedule"}
            </button>
          </div>
        </form>
      </Modal>

      <ActionModal
        isOpen={Boolean(deleteTarget)}
        content={`Delete recurring item "${deleteTarget?.title}"?`}
        primaryBtnText="Delete"
        secBtnText="Cancel"
        primaryAction={confirmDelete}
        secAction={() => setDeleteTarget(null)}
      />
    </div>
  );
}
