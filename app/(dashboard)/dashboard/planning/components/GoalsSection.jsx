"use client";

import { useState } from "react";
import { BiEdit, BiMinus, BiPause, BiPlay, BiPlus, BiTrash } from "react-icons/bi";
import { toast } from "sonner";
import { cFormat, getCurrencySymbol } from "@/app/utils/currencyFormat";
import { usePlanningMutations } from "@/app/hooks/useFinanceData";
import ActionModal from "@/app/components/ActionModal";
import DatePicker from "@/app/components/DatePicker";
import Dropdown from "@/app/components/Dropdown";
import Modal from "@/app/components/Modal";
import AnimatedNumber from "@/app/components/AnimatedNumber";
import ProgressRing from "@/app/components/ProgressRing";

const EMPTY_FORM = {
  name: "",
  target_amount: "",
  current_amount: "",
  monthly_contribution: "",
  target_date: "",
  category: "emergency",
  priority: "medium",
  notes: "",
};

const GOAL_CATEGORIES = [
  { key: "emergency", name: "Emergency Fund" },
  { key: "travel", name: "Travel" },
  { key: "purchase", name: "Major Purchase" },
  { key: "investment", name: "Investment" },
  { key: "education", name: "Education" },
  { key: "general", name: "General Pot" },
];

const PRIORITY_OPTIONS = [
  { key: "high", name: "High" },
  { key: "medium", name: "Medium" },
  { key: "low", name: "Low" },
];

const QUICK_CHIPS = [500, 1000, 5000];

export default function GoalsSection({ planning, currency }) {
  const { createGoal, updateGoal, deleteGoal } = usePlanningMutations();
  const goals = planning?.goals || [];
  const summary = planning?.goalsSummary || {
    totalTarget: 0,
    totalSaved: 0,
    totalRemaining: 0,
    totalMonthlyContribution: 0,
    overallProgressPercent: 0,
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustMode, setAdjustMode] = useState("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const symbol = getCurrencySymbol(currency);

  const openCreateModal = () => {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name || "",
      target_amount: String(goal.target_amount || ""),
      current_amount: String(goal.current_amount || 0),
      monthly_contribution: String(goal.monthly_contribution || 0),
      target_date: goal.target_date || "",
      category: goal.category || "general",
      priority: goal.priority || "medium",
      notes: goal.notes || "",
    });
    setModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a goal name");
      return;
    }
    if (!Number(form.target_amount) || Number(form.target_amount) <= 0) {
      toast.error("Target amount must be greater than zero");
      return;
    }

    const payload = {
      name: form.name.trim(),
      target_amount: Number(form.target_amount),
      current_amount: Number(form.current_amount) || 0,
      monthly_contribution: Number(form.monthly_contribution) || 0,
      target_date: form.target_date || null,
      category: form.category,
      priority: form.priority,
      notes: form.notes.trim(),
    };

    try {
      if (editingGoal) {
        await updateGoal.mutateAsync({ id: editingGoal.id, payload });
        toast.success(`Updated "${payload.name}"`);
      } else {
        await createGoal.mutateAsync(payload);
        toast.success(`Goal "${payload.name}" created`);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to save goal");
    }
  };

  const openAdjustModal = (goal, mode) => {
    setAdjustTarget(goal);
    setAdjustMode(mode);
    setAdjustAmount(
      mode === "add" && goal.monthly_contribution > 0
        ? String(goal.monthly_contribution)
        : ""
    );
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const numeric = Number(adjustAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    const delta = adjustMode === "withdraw" ? -numeric : numeric;
    try {
      await updateGoal.mutateAsync({
        id: adjustTarget.id,
        payload: { adjust_amount: delta },
      });
      toast.success(
        adjustMode === "withdraw"
          ? `Withdrew ${cFormat(numeric, { currency })} from ${adjustTarget.name}`
          : `Added ${cFormat(numeric, { currency })} to ${adjustTarget.name}`
      );
      setAdjustTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to update goal balance");
    }
  };

  const toggleStatus = async (goal) => {
    const nextStatus = goal.status === "paused" ? "active" : "paused";
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        payload: { status: nextStatus },
      });
      toast.success(
        nextStatus === "paused" ? `Paused "${goal.name}"` : `Resumed "${goal.name}"`
      );
    } catch (err) {
      toast.error(err.message || "Failed to change goal status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGoal.mutateAsync(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
    } catch (err) {
      toast.error(err.message || "Failed to delete goal");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Summary Bar */}
      <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3.5">
            <ProgressRing
              percent={summary.overallProgressPercent}
              size={50}
              colorClass="text-green-100"
            />
            <div>
              <div className="text-xs text-ink-subtle">Total Saved in Goals</div>
              <div className="text-xl font-light text-ink-primary mt-0.5 tabular-nums">
                <AnimatedNumber value={summary.totalSaved} currency={currency} />
                <span className="text-xs text-ink-subtle ml-1.5">
                  / {cFormat(summary.totalTarget, { currency })}
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Remaining to Target</div>
            <div className="text-base font-medium text-ink-secondary mt-0.5">
              <AnimatedNumber value={summary.totalRemaining} currency={currency} />
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-subtle">Planned Monthly Savings</div>
            <div className="text-base font-medium text-green-100 mt-0.5">
              <AnimatedNumber
                value={summary.totalMonthlyContribution}
                currency={currency}
              />{" "}
              / mo
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
        >
          <BiPlus size={18} />
          New Goal
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-surface-elevated/40 border border-line-subtle rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <p className="text-sm text-ink-muted">
            Create standalone savings pots for your emergency fund, travel, or major purchases.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2 rounded-full bg-surface-elevated hover:bg-surface-hover border border-line text-sm text-ink-secondary cursor-pointer transition-all active:scale-[0.97]"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal, idx) => {
            const isCompleted = goal.status === "completed";
            const isPaused = goal.status === "paused";
            return (
              <div
                key={goal.id}
                style={{ animationDelay: `${Math.min(idx * 45, 240)}ms` }}
                className="animate-fade-up bg-surface-elevated/50 border border-line-subtle hover:border-line-strong rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProgressRing
                      percent={goal.progress_percent}
                      size={44}
                      strokeWidth={3.5}
                      colorClass={isCompleted ? "text-green-100" : "text-ink-secondary"}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-normal text-ink-primary truncate">
                          {goal.name}
                        </h4>
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-10 text-green-100 shrink-0">
                            Reached
                          </span>
                        )}
                        {isPaused && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-tint-hover text-ink-muted shrink-0">
                            Paused
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-subtle capitalize mt-0.5 truncate">
                        {goal.category} • {goal.priority} priority
                        {goal.target_date ? ` • Due ${goal.target_date}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => toggleStatus(goal)}
                        className="p-1.5 text-ink-subtle hover:text-ink-secondary hover:bg-tint rounded-full cursor-pointer transition-colors"
                        title={isPaused ? "Resume goal" : "Pause goal"}
                      >
                        {isPaused ? <BiPlay size={16} /> : <BiPause size={16} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(goal)}
                      className="p-1.5 text-ink-subtle hover:text-ink-secondary hover:bg-tint rounded-full cursor-pointer transition-colors"
                      title="Edit goal"
                    >
                      <BiEdit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(goal)}
                      className="p-1.5 text-ink-subtle hover:text-red-100 hover:bg-tint rounded-full cursor-pointer transition-colors"
                      title="Delete goal"
                    >
                      <BiTrash size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <AnimatedNumber
                      value={goal.current_amount}
                      currency={currency}
                      className="text-xl font-light text-ink-primary"
                    />
                    <span className="text-xs text-ink-subtle tabular-nums">
                      of {cFormat(goal.target_amount, { currency })}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-tint overflow-hidden">
                    <div
                      style={{ width: `${goal.progress_percent}%` }}
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        isCompleted ? "bg-green-100" : "bg-ink-body"
                      }`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-subtle tabular-nums">
                    <span>
                      {goal.remaining_amount > 0
                        ? `${cFormat(goal.remaining_amount, { currency })} left`
                        : "Target achieved"}
                    </span>
                    <span>
                      {goal.monthly_contribution > 0
                        ? `${cFormat(goal.monthly_contribution, { currency })}/mo`
                        : ""}
                      {goal.months_to_goal > 0
                        ? ` (${goal.months_to_goal} mo)`
                        : goal.required_monthly
                        ? `Need ${cFormat(goal.required_monthly, { currency })}/mo`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-line-faint">
                  <button
                    type="button"
                    onClick={() => openAdjustModal(goal, "add")}
                    className="flex-1 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs text-ink-secondary flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.97]"
                  >
                    <BiPlus size={14} />
                    Add Funds
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdjustModal(goal, "withdraw")}
                    disabled={goal.current_amount <= 0}
                    className="flex-1 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs text-ink-muted flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.97] disabled:opacity-40"
                  >
                    <BiMinus size={14} />
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? "Edit Savings Goal" : "New Savings Goal"}
        subtitle="Tracked independently from wallet balances."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveGoal} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Goal Name</label>
            <input
              type="text"
              placeholder="e.g. Emergency Fund"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Target Amount</label>
              <input
                type="number"
                min="1"
                placeholder="100000"
                value={form.target_amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, target_amount: e.target.value }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Saved So Far</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.current_amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, current_amount: e.target.value }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Monthly Plan</label>
              <input
                type="number"
                min="0"
                placeholder="5000"
                value={form.monthly_contribution}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    monthly_contribution: e.target.value,
                  }))
                }
                className="bg-surface-elevated border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Category</label>
              <Dropdown
                options={GOAL_CATEGORIES}
                value={form.category}
                onChange={(opt) => setForm((p) => ({ ...p, category: opt.key }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Priority</label>
              <Dropdown
                options={PRIORITY_OPTIONS}
                value={form.priority}
                onChange={(opt) => setForm((p) => ({ ...p, priority: opt.key }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Target Date</label>
              <DatePicker
                value={form.target_date}
                onChange={(val) => setForm((p) => ({ ...p, target_date: val }))}
                placeholder="Optional"
                clearable={true}
                align="right"
              />
            </div>
          </div>

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
              disabled={createGoal.isPending || updateGoal.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {editingGoal ? "Save Goal" : "Create Goal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribute / Withdraw Modal */}
      <Modal
        isOpen={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title={
          adjustMode === "withdraw"
            ? `Withdraw from ${adjustTarget?.name}`
            : `Add Funds to ${adjustTarget?.name}`
        }
        subtitle={`Current balance: ${cFormat(
          adjustTarget?.current_amount || 0,
          { currency }
        )} • Standalone tracker`}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleAdjustSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {adjustTarget?.monthly_contribution > 0 && (
              <button
                type="button"
                onClick={() =>
                  setAdjustAmount(String(adjustTarget.monthly_contribution))
                }
                className="px-3 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-hover border border-line-subtle text-ink-secondary cursor-pointer transition-all active:scale-[0.97] tabular-nums"
              >
                Monthly ({symbol}
                {adjustTarget.monthly_contribution})
              </button>
            )}
            {QUICK_CHIPS.map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() =>
                  setAdjustAmount((prev) => String((Number(prev) || 0) + chip))
                }
                className="px-3 py-1 rounded-full text-xs bg-surface-elevated hover:bg-surface-hover border border-line-subtle text-ink-body cursor-pointer transition-all active:scale-[0.97] tabular-nums"
              >
                +{symbol}
                {chip}
              </button>
            ))}
          </div>

          <input
            type="number"
            min="1"
            autoFocus
            placeholder="Enter amount"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="bg-surface-elevated border border-line rounded-xl px-4 py-2.5 text-sm text-ink-primary tabular-nums focus:outline-none focus:border-line-focus"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdjustTarget(null)}
              className="px-4 py-2 rounded-full text-sm bg-surface-elevated text-ink-body hover:bg-surface-hover cursor-pointer transition-all active:scale-[0.97]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateGoal.isPending}
              className="px-5 py-2 rounded-full text-sm font-medium bg-cta text-cta-ink hover:bg-cta-hover cursor-pointer transition-all active:scale-[0.97] disabled:opacity-60"
            >
              Confirm
            </button>
          </div>
        </form>
      </Modal>

      <ActionModal
        isOpen={Boolean(deleteTarget)}
        content={`Delete savings goal "${deleteTarget?.name}"?`}
        primaryBtnText="Delete"
        secBtnText="Cancel"
        primaryAction={confirmDelete}
        secAction={() => setDeleteTarget(null)}
      />
    </div>
  );
}
