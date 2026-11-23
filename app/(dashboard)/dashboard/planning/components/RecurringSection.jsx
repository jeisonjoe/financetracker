"use client";

import { useMemo, useState } from "react";
import {
  BiCalendar,
  BiCheckCircle,
  BiCreditCard,
  BiEdit,
  BiListUl,
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
import { useRhsSidebarStore } from "@/app/store/RhsSidebarStore";
import AddTransactionSidebar from "@/app/(dashboard)/components/AddTransactionSidebar";
import ActionModal from "@/app/components/ActionModal";
import DatePicker from "@/app/components/DatePicker";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";
import Checkbox from "@/app/components/Checkbox";
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
      cls: "bg-tint text-ink-subtle",
      dot: "bg-ink-subtle",
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
      cls: "bg-accent-soft text-accent",
      dot: "bg-accent",
    };
  }
  if (days <= 7) {
    return {
      label: `In ${days}d`,
      cls: "bg-tint-hover text-ink-secondary",
      dot: "bg-ink-secondary",
    };
  }
  return {
    label: item.next_due_date,
    cls: "bg-tint text-ink-muted",
    dot: "bg-ink-subtle",
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
  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { open } = useRhsSidebarStore();

  const handlePayNow = (item) => {
    open(AddTransactionSidebar, {
      initialType: item.type || "expense",
      initialValues: {
        amount: item.amount,
        payee: item.title,
        category: item.category,
        wallet: item.wallet,
        note: `Recurring: ${item.title}`,
        recurring_id: item.id,
      },
    });
  };

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
      <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-ink-subtle">Monthly Recurring Income</div>
            <div className="text-base font-medium text-green-100 mt-0.5">
              <AnimatedNumber
                value={summary.monthlyIncome}
                currency={currency}
                prefix="+"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Monthly Fixed Bills</div>
            <div className="text-base font-medium text-red-100 mt-0.5">
              <AnimatedNumber
                value={summary.monthlyExpense}
                currency={currency}
                prefix="-"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Net Monthly Recurring</div>
            <div
              className={`text-base font-medium mt-0.5 ${
                summary.netMonthlyRecurring < 0 ? "text-red-100" : "text-ink-secondary"
              }`}
            >
              <AnimatedNumber
                value={summary.netMonthlyRecurring}
                currency={currency}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-surface border border-line-subtle p-1 rounded-full">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "list"
                  ? "bg-tint-active text-ink-primary font-medium"
                  : "text-ink-subtle hover:text-ink-body"
              }`}
            >
              <BiListUl size={14} />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                viewMode === "calendar"
                  ? "bg-tint-active text-ink-primary font-medium"
                  : "text-ink-subtle hover:text-ink-body"
              }`}
            >
              <BiCalendar size={14} />
              Calendar
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
          >
            <BiPlus size={18} />
            Add Schedule
          </button>
        </div>
      </div>

      {/* Filter Pills (in List view) */}
      {viewMode === "list" && items.length > 0 && (
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
                    ? "bg-tint-active text-ink-primary"
                    : "text-ink-subtle hover:text-ink-secondary hover:bg-tint-subtle"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" ? (
        <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-ink-primary">
                Monthly Due Dates &amp; Cash Outflow Schedule
              </h3>
              <p className="text-xs text-ink-subtle mt-0.5">
                Overview of payment deadlines across the current month to anticipate cash crunches
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const dayItems = items.filter((item) => {
                if (!item.next_due_date) return false;
                const d = new Date(item.next_due_date).getDate();
                return d === day;
              });

              const dayExpense = dayItems
                .filter((it) => it.type === "expense")
                .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
              const dayIncome = dayItems
                .filter((it) => it.type === "income")
                .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

              const todayDate = new Date().getDate();
              const isToday = day === todayDate;

              return (
                <div
                  key={day}
                  className={`min-h-[100px] p-2.5 rounded-xl border flex flex-col justify-between text-xs transition-colors ${
                    isToday
                      ? "bg-surface-elevated border-line-focus shadow-xs"
                      : dayItems.length > 0
                      ? "bg-surface border-line"
                      : "bg-surface/40 border-line-subtle opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        isToday ? "text-accent" : "text-ink-subtle"
                      }`}
                    >
                      Day {day} {isToday ? "(Today)" : ""}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] bg-tint px-1.5 py-0.2 rounded-full text-ink-subtle">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 my-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handlePayNow(item)}
                        className="truncate text-[11px] p-1 rounded-md bg-tint-subtle hover:bg-tint cursor-pointer transition-colors"
                        title={`${item.title} - ${cFormat(item.amount, { currency })} (Click to Pay)`}
                      >
                        <span className="font-normal text-ink-primary truncate block">
                          {item.title}
                        </span>
                        <span
                          className={`text-[10px] font-medium tabular-nums ${
                            item.type === "income" ? "text-green-100" : "text-red-100"
                          }`}
                        >
                          {item.type === "income" ? "+" : "-"}
                          {cFormat(item.amount, { currency })}
                        </span>
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <span className="text-[10px] text-ink-subtle">
                        +{dayItems.length - 2} more
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] pt-1 border-t border-line-faint tabular-nums text-right">
                    {dayExpense > 0 && (
                      <span className="text-red-100 font-medium block">
                        -{cFormat(dayExpense, { currency })}
                      </span>
                    )}
                    {dayIncome > 0 && (
                      <span className="text-green-100 font-medium block">
                        +{cFormat(dayIncome, { currency })}
                      </span>
                    )}
                    {dayExpense === 0 && dayIncome === 0 && (
                      <span className="text-ink-faint">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-surface-elevated/40 border border-line-subtle rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <p className="text-sm text-ink-muted">
            {items.length === 0
              ? "Track rent, subscriptions, EMIs, and expected salary to keep committed cash clear."
              : "No recurring items match this filter."}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-5 py-2 rounded-full bg-surface-elevated hover:bg-surface-hover border border-line text-sm text-ink-secondary cursor-pointer transition-all active:scale-[0.97]"
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
                className="animate-fade-up bg-surface-elevated/50 border border-line-subtle hover:border-line-strong rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-normal text-ink-primary">
                        {item.title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] tabular-nums ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-ink-subtle capitalize">
                        {item.frequency}
                      </span>
                    </div>
                    <div className="text-xs text-ink-subtle">
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
                      isIncome ? "text-green-100" : "text-ink-secondary"
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
                          onClick={() => handlePayNow(item)}
                          className="px-3 py-1.5 rounded-full bg-cta text-cta-ink hover:bg-cta-hover text-xs font-medium flex items-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          title="Open transaction sidebar prefilled with this bill"
                        >
                          <BiCreditCard size={14} />
                          Pay Now
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProcess(item, "log")}
                          disabled={processRecurring.isPending}
                          className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-line text-xs text-ink-secondary flex items-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          title="Log as transaction & advance due date"
                        >
                          <BiCheckCircle size={14} />
                          Log &amp; Advance
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProcess(item, "skip")}
                          disabled={processRecurring.isPending}
                          className="p-1.5 text-ink-subtle hover:text-ink-secondary hover:bg-tint rounded-full cursor-pointer transition-colors"
                          title="Skip this cycle"
                        >
                          <BiSkipNext size={17} />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      className="p-1.5 text-ink-subtle hover:text-ink-secondary hover:bg-tint rounded-full cursor-pointer transition-colors"
                      title={item.is_active ? "Pause" : "Resume"}
                    >
                      {item.is_active ? <BiPause size={16} /> : <BiPlay size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-ink-subtle hover:text-ink-secondary hover:bg-tint rounded-full cursor-pointer transition-colors"
                      title="Edit"
                    >
                      <BiEdit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-ink-subtle hover:text-red-100 hover:bg-tint rounded-full cursor-pointer transition-colors"
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
          <div className="flex bg-surface-elevated border border-line-subtle p-1 rounded-full self-start">
            {["expense", "income"].map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setForm((p) => ({ ...p, type: t }))}
                className={`px-5 py-1.5 rounded-full text-xs capitalize cursor-pointer transition-all ${
                  form.type === t
                    ? t === "income"
                      ? "bg-green-10 text-green-100"
                      : "bg-cta text-cta-ink"
                    : "text-ink-subtle hover:text-ink-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Title</label>
              <input
                type="text"
                placeholder="e.g. House Rent or Salary"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Amount</label>
              <input
                type="number"
                min="1"
                placeholder="0"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Frequency</label>
              <Dropdown
                options={FREQUENCIES}
                value={form.frequency}
                onChange={(opt) => setForm((p) => ({ ...p, frequency: opt.key }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Next Due Date</label>
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
              <label className="text-xs text-ink-subtle">Category</label>
              <Dropdown
                options={categories
                  .filter(
                    (c) =>
                      c.type === form.type || c.type === "both" || !c.type
                  )
                  .map((c) => ({ key: c.name, name: c.name }))}
                value={form.category}
                onChange={(opt) => setForm((p) => ({ ...p, category: opt.key }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Preferred Wallet</label>
              <Dropdown
                options={wallets.map((w) => ({ key: w.name, name: w.name }))}
                value={form.wallet}
                onChange={(opt) => setForm((p) => ({ ...p, wallet: opt.key }))}
              />
            </div>
          </div>

          {form.type === "expense" && (
            <Checkbox
              checked={form.auto_reserve}
              onChange={(val) => setForm((p) => ({ ...p, auto_reserve: val }))}
              label="Reserve this bill in my monthly committed cashflow plan"
              size="sm"
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRecurring.isPending || updateRecurring.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
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
