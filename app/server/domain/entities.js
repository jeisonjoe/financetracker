/**
 * Safely parses JSON payloads returned from MySQL (string/object) or Postgres/Supabase.
 */
export function parseJsonColumn(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return typeof value === "object" ? value : fallback;
}

/**
 * Domain entity representing an authenticated user.
 */
export class UserEntity {
  constructor({ id, email, firstName = "", lastName = "", currency = "INR" }) {
    this.id = String(id);
    this.email = email || "";
    this.firstName = firstName || "";
    this.lastName = lastName || "";
    this.currency = currency || "INR";
  }

  get fullName() {
    const combined = `${this.firstName} ${this.lastName}`.trim();
    if (combined) return combined;
    return this.email ? this.email.split("@")[0] : "User";
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      currency: this.currency,
    };
  }
}

/**
 * Domain entity representing a financial transaction.
 */
export class TransactionEntity {
  constructor(row) {
    const meta = parseJsonColumn(row.transaction, {});
    const rawDate = row.created_at || row.createdAt;
    const createdAtDate = rawDate ? new Date(rawDate) : new Date();
    const safeDate = Number.isNaN(createdAtDate.getTime())
      ? new Date()
      : createdAtDate;

    const categoryName =
      typeof meta.category === "string"
        ? meta.category
        : meta.category?.name || "Uncategorized";
    const walletName =
      typeof meta.wallet === "string"
        ? meta.wallet
        : meta.wallet?.name || "Cash";
    const toWalletName =
      typeof meta.to_wallet === "string"
        ? meta.to_wallet
        : meta.to_wallet?.name || "";

    const normalizedType =
      row.type === "income" || row.type === "transfer" ? row.type : "expense";

    const subcategoryName =
      typeof meta.subcategory === "string"
        ? meta.subcategory
        : meta.subcategory?.name || meta.sub_category || null;

    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    this.type = normalizedType;
    this.amount = Number(row.amount) || 0;
    this.createdAt = safeDate.toISOString();
    this.note = meta.note || "";
    this.payee = meta.payee || "";
    this.time = meta.time || "";
    this.externalId = meta.external_id || null;
    this.category =
      typeof meta.category === "object" && meta.category !== null
        ? { key: meta.category.key || categoryName, name: categoryName }
        : { key: categoryName, name: categoryName };
    this.subcategory = subcategoryName
      ? typeof meta.subcategory === "object" && meta.subcategory !== null
        ? { key: meta.subcategory.key || subcategoryName, name: subcategoryName }
        : { key: subcategoryName, name: subcategoryName }
      : null;
    this.wallet =
      typeof meta.wallet === "object" && meta.wallet !== null
        ? { key: meta.wallet.key || walletName, name: walletName }
        : { key: walletName, name: walletName };
    this.toWallet = toWalletName
      ? typeof meta.to_wallet === "object" && meta.to_wallet !== null
        ? { key: meta.to_wallet.key || toWalletName, name: toWalletName }
        : { key: toWalletName, name: toWalletName }
      : null;
    this.splits = Array.isArray(meta.splits) ? meta.splits : [];
    this.tags = Array.isArray(meta.tags)
      ? meta.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    this.isAdjustment = Boolean(meta.is_adjustment);
    this.recurringId = meta.recurring_id ? String(meta.recurring_id) : null;
    this.meta = meta;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      type: this.type,
      amount: this.amount,
      created_at: this.createdAt,
      note: this.note,
      payee: this.payee,
      time: this.time,
      external_id: this.externalId,
      category: this.category.name,
      category_obj: this.category,
      subcategory: this.subcategory ? this.subcategory.name : null,
      subcategory_obj: this.subcategory,
      wallet: this.wallet.name,
      wallet_obj: this.wallet,
      to_wallet: this.toWallet ? this.toWallet.name : null,
      to_wallet_obj: this.toWallet,
      splits: this.splits,
      tags: this.tags,
      is_adjustment: this.isAdjustment,
      recurring_id: this.recurringId,
      transaction: {
        ...this.meta,
        note: this.note,
        payee: this.payee,
        time: this.time,
        category: this.category,
        ...(this.subcategory ? { subcategory: this.subcategory } : {}),
        wallet: this.wallet,
        ...(this.toWallet ? { to_wallet: this.toWallet } : {}),
        ...(this.externalId ? { external_id: this.externalId } : {}),
        splits: this.splits,
        tags: this.tags,
        ...(this.isAdjustment ? { is_adjustment: true } : {}),
        ...(this.recurringId ? { recurring_id: this.recurringId } : {}),
      },
    };
  }
}

/**
 * Domain entity representing a spending/income category.
 */
export class CategoryEntity {
  constructor(row) {
    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    const rawParentId = row.parent_id ?? row.parentId;
    this.parentId =
      rawParentId !== undefined && rawParentId !== null && rawParentId !== ""
        ? String(rawParentId)
        : null;
    this.name = row.name || "";
    this.type = row.type || "expense";
    this.icon = parseJsonColumn(row.icon, null);
    this.monthlyBudget = Number(row.monthly_budget ?? row.monthlyBudget ?? 0);
    this.rollover = Boolean(this.icon?.rollover ?? row.rollover);
    this.color = this.icon?.color || row.color || null;
    this.createdAt = row.created_at
      ? new Date(row.created_at).toISOString()
      : null;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      parent_id: this.parentId,
      name: this.name,
      type: this.type,
      icon: this.icon,
      monthly_budget: this.monthlyBudget,
      rollover: this.rollover,
      color: this.color,
      created_at: this.createdAt,
    };
  }
}

/**
 * Domain entity representing a user wallet or bank account.
 */
export class WalletEntity {
  constructor(row) {
    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    this.name = row.name || "";
    this.type = row.type || "debit";
    this.openingBalance = Number(row.opening_balance ?? row.openingBalance ?? 0);
    this.creditLimit = Number(row.credit_limit ?? row.creditLimit ?? 0);
    this.statementDay =
      row.statement_day !== undefined && row.statement_day !== null
        ? Number(row.statement_day)
        : null;
    this.dueDay =
      row.due_day !== undefined && row.due_day !== null
        ? Number(row.due_day)
        : null;
    this.createdAt = row.created_at
      ? new Date(row.created_at).toISOString()
      : null;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      name: this.name,
      type: this.type,
      opening_balance: this.openingBalance,
      credit_limit: this.creditLimit,
      statement_day: this.statementDay,
      due_day: this.dueDay,
      created_at: this.createdAt,
    };
  }
}

/**
 * Domain entity representing a standalone savings goal or fund pot.
 */
export class FundGoalEntity {
  constructor(row) {
    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    this.name = row.name || "";
    this.targetAmount = Math.max(0, Number(row.target_amount ?? row.targetAmount ?? 0));
    this.currentAmount = Math.max(0, Number(row.current_amount ?? row.currentAmount ?? 0));
    this.monthlyContribution = Math.max(
      0,
      Number(row.monthly_contribution ?? row.monthlyContribution ?? 0)
    );
    this.targetDate = row.target_date ?? row.targetDate ?? null;
    this.category = row.category || "general";
    this.priority = row.priority || "medium";
    this.status = row.status || "active";
    this.notes = row.notes || "";
    this.createdAt = row.created_at ? new Date(row.created_at).toISOString() : null;
    this.updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : null;
  }

  toJSON() {
    const remainingAmount = Math.max(0, this.targetAmount - this.currentAmount);
    const progressPercent =
      this.targetAmount > 0
        ? Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100))
        : 0;
    const monthsToGoal =
      remainingAmount === 0
        ? 0
        : this.monthlyContribution > 0
        ? Math.ceil(remainingAmount / this.monthlyContribution)
        : null;

    let requiredMonthly = null;
    if (remainingAmount > 0 && this.targetDate) {
      const target = new Date(this.targetDate);
      if (!Number.isNaN(target.getTime())) {
        const now = new Date();
        const monthsDiff = Math.max(
          1,
          (target.getFullYear() - now.getFullYear()) * 12 +
            (target.getMonth() - now.getMonth())
        );
        requiredMonthly = Math.ceil(remainingAmount / monthsDiff);
      }
    }

    return {
      id: this.id,
      user_id: this.userId,
      name: this.name,
      target_amount: this.targetAmount,
      current_amount: this.currentAmount,
      monthly_contribution: this.monthlyContribution,
      target_date: this.targetDate,
      category: this.category,
      priority: this.priority,
      status: this.status,
      notes: this.notes,
      remaining_amount: remainingAmount,
      progress_percent: progressPercent,
      months_to_goal: monthsToGoal,
      required_monthly: requiredMonthly,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

const FREQUENCY_TO_MONTHLY = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/**
 * Domain entity representing a recurring bill, subscription, or scheduled income.
 */
export class RecurringItemEntity {
  constructor(row) {
    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    this.title = row.title || "";
    this.type = row.type === "income" ? "income" : "expense";
    this.amount = Math.max(0, Number(row.amount ?? 0));
    this.frequency = FREQUENCY_TO_MONTHLY[row.frequency] ? row.frequency : "monthly";
    this.nextDueDate = row.next_due_date ?? row.nextDueDate ?? new Date().toISOString().slice(0, 10);
    this.category = row.category || "Bills & Utilities";
    this.wallet = row.wallet || "Cash";
    this.isActive = Boolean(row.is_active ?? row.isActive ?? true);
    this.autoReserve = Boolean(row.auto_reserve ?? row.autoReserve ?? true);
    this.notes = row.notes || "";
    this.createdAt = row.created_at ? new Date(row.created_at).toISOString() : null;
    this.updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : null;
  }

  get monthlyEquivalent() {
    const factor = FREQUENCY_TO_MONTHLY[this.frequency] || 1;
    return Math.round(this.amount * factor);
  }

  get daysUntilDue() {
    const due = new Date(`${String(this.nextDueDate).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(due.getTime())) return 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  static computeNextDueDate(dateStr, frequency = "monthly") {
    const base = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
    const safe = Number.isNaN(base.getTime()) ? new Date() : base;
    const next = new Date(safe.getTime());

    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (frequency === "biweekly") next.setDate(next.getDate() + 14);
    else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);

    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, "0");
    const dd = String(next.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      title: this.title,
      type: this.type,
      amount: this.amount,
      frequency: this.frequency,
      next_due_date: String(this.nextDueDate).slice(0, 10),
      category: this.category,
      wallet: this.wallet,
      is_active: this.isActive,
      auto_reserve: this.autoReserve,
      notes: this.notes,
      monthly_equivalent: this.monthlyEquivalent,
      days_until_due: this.daysUntilDue,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

/**
 * Domain entity representing a user's monthly income allocation & cashflow plan.
 */
export class FundPlanEntity {
  constructor(row = {}) {
    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    this.monthlyIncomeTarget = Math.max(
      0,
      Number(row.monthly_income_target ?? row.monthlyIncomeTarget ?? 0)
    );
    this.needsPercent = Number(row.needs_percent ?? row.needsPercent ?? 50);
    this.wantsPercent = Number(row.wants_percent ?? row.wantsPercent ?? 30);
    this.savingsPercent = Number(row.savings_percent ?? row.savingsPercent ?? 20);
    this.reserveBuffer = Math.max(
      0,
      Number(row.reserve_buffer ?? row.reserveBuffer ?? 0)
    );
    this.categoryBuckets = parseJsonColumn(
      row.category_buckets ?? row.categoryBuckets,
      {}
    );
    this.updatedAt = row.updated_at ? new Date(row.updated_at).toISOString() : null;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      monthly_income_target: this.monthlyIncomeTarget,
      needs_percent: this.needsPercent,
      wants_percent: this.wantsPercent,
      savings_percent: this.savingsPercent,
      reserve_buffer: this.reserveBuffer,
      category_buckets: this.categoryBuckets,
      updated_at: this.updatedAt,
    };
  }
}

/**
 * Domain entity representing a user-configurable merchant auto-categorization rule.
 */
export class MerchantRuleEntity {
  constructor(row = {}) {
    this.id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    this.userId = row.user_id ? String(row.user_id) : null;
    this.pattern = String(row.pattern || "");
    this.category = String(row.category || "Uncategorized");
    this.subcategory = row.subcategory ? String(row.subcategory) : null;
    this.payee = row.payee ? String(row.payee) : null;
    this.defaultNote = row.default_note ?? row.defaultNote ?? null;
    this.tags = Array.isArray(row.tags)
      ? row.tags
      : parseJsonColumn(row.tags, []);
    this.isActive = Boolean(row.is_active ?? row.isActive ?? true);
    this.createdAt = row.created_at ? new Date(row.created_at).toISOString() : null;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.userId,
      pattern: this.pattern,
      category: this.category,
      subcategory: this.subcategory,
      payee: this.payee,
      default_note: this.defaultNote,
      tags: this.tags,
      is_active: this.isActive,
      created_at: this.createdAt,
    };
  }
}

