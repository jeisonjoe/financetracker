import { RecurringItemEntity } from "../domain/entities.js";
import { NotFoundError, ValidationError } from "../domain/errors.js";

const VALID_FREQUENCIES = new Set([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
const VALID_GOAL_STATUSES = new Set(["active", "paused", "completed"]);

/**
 * Application service for standalone savings goals, recurring bills/income,
 * and monthly income allocation / cashflow planning.
 */
export class PlanningService {
  constructor(
    fundGoalRepo,
    recurringRepo,
    fundPlanRepo,
    transactionRepo,
    categoryRepo
  ) {
    this.fundGoalRepo = fundGoalRepo;
    this.recurringRepo = recurringRepo;
    this.fundPlanRepo = fundPlanRepo;
    this.transactionRepo = transactionRepo;
    this.categoryRepo = categoryRepo;
  }

  // -------------------- Savings Goals --------------------

  async listGoals(userId) {
    const goals = await this.fundGoalRepo.findAllForUser(userId);
    return goals.map((g) => g.toJSON());
  }

  async createGoal(userId, body) {
    if (!body?.name || !String(body.name).trim()) {
      throw new ValidationError("Goal name is required");
    }
    const targetAmount = Math.round(Number(body.target_amount ?? body.targetAmount) || 0);
    if (targetAmount <= 0) {
      throw new ValidationError("Target amount must be greater than zero");
    }
    const currentAmount = Math.max(
      0,
      Math.round(Number(body.current_amount ?? body.currentAmount) || 0)
    );
    const monthlyContribution = Math.max(
      0,
      Math.round(Number(body.monthly_contribution ?? body.monthlyContribution) || 0)
    );
    const priority = VALID_PRIORITIES.has(body.priority) ? body.priority : "medium";
    const status = currentAmount >= targetAmount ? "completed" : "active";

    const created = await this.fundGoalRepo.create(userId, {
      name: String(body.name).trim(),
      targetAmount,
      currentAmount,
      monthlyContribution,
      targetDate: body.target_date ?? body.targetDate ?? null,
      category: String(body.category || "general").trim(),
      priority,
      status,
      notes: String(body.notes || "").trim(),
    });
    return created.toJSON();
  }

  async updateGoal(id, userId, body) {
    if (!id) throw new ValidationError("Goal ID is required");

    if (body.adjust_amount !== undefined || body.adjustAmount !== undefined) {
      return this.adjustGoalAmount(id, userId, {
        delta: Number(body.adjustAmount ?? body.adjust_amount),
      });
    }

    const patch = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        throw new ValidationError("Goal name cannot be empty");
      }
      patch.name = String(body.name).trim();
    }
    if (body.target_amount !== undefined || body.targetAmount !== undefined) {
      const target = Math.round(Number(body.targetAmount ?? body.target_amount) || 0);
      if (target <= 0) {
        throw new ValidationError("Target amount must be greater than zero");
      }
      patch.targetAmount = target;
    }
    if (body.current_amount !== undefined || body.currentAmount !== undefined) {
      patch.currentAmount = Math.max(
        0,
        Math.round(Number(body.currentAmount ?? body.current_amount) || 0)
      );
    }
    if (
      body.monthly_contribution !== undefined ||
      body.monthlyContribution !== undefined
    ) {
      patch.monthlyContribution = Math.max(
        0,
        Math.round(
          Number(body.monthlyContribution ?? body.monthly_contribution) || 0
        )
      );
    }
    if (body.target_date !== undefined || body.targetDate !== undefined) {
      patch.targetDate = body.targetDate ?? body.target_date ?? null;
    }
    if (body.category !== undefined) {
      patch.category = String(body.category || "general").trim();
    }
    if (body.priority !== undefined && VALID_PRIORITIES.has(body.priority)) {
      patch.priority = body.priority;
    }
    if (body.status !== undefined && VALID_GOAL_STATUSES.has(body.status)) {
      patch.status = body.status;
    }
    if (body.notes !== undefined) {
      patch.notes = String(body.notes || "").trim();
    }

    const updated = await this.fundGoalRepo.update(id, userId, patch);
    return updated.toJSON();
  }

  async adjustGoalAmount(id, userId, { delta }) {
    if (!id) throw new ValidationError("Goal ID is required");
    if (!Number.isFinite(delta) || delta === 0) {
      throw new ValidationError("Contribution or withdrawal amount must be non-zero");
    }

    const existing = await this.fundGoalRepo.findById(id, userId);
    if (!existing) throw new NotFoundError("Goal not found");

    const nextAmount = Math.max(0, existing.currentAmount + Math.round(delta));
    let nextStatus = existing.status;
    if (nextAmount >= existing.targetAmount && existing.targetAmount > 0) {
      nextStatus = "completed";
    } else if (existing.status === "completed" && nextAmount < existing.targetAmount) {
      nextStatus = "active";
    }

    const updated = await this.fundGoalRepo.update(id, userId, {
      currentAmount: nextAmount,
      status: nextStatus,
    });
    return updated.toJSON();
  }

  async deleteGoal(id, userId) {
    if (!id) throw new ValidationError("Goal ID is required");
    return this.fundGoalRepo.delete(id, userId);
  }

  // -------------------- Recurring Items --------------------

  async listRecurring(userId) {
    const items = await this.recurringRepo.findAllForUser(userId);
    return items.map((item) => item.toJSON());
  }

  async createRecurring(userId, body) {
    if (!body?.title || !String(body.title).trim()) {
      throw new ValidationError("Title is required");
    }
    const amount = Math.round(Number(body.amount) || 0);
    if (amount <= 0) {
      throw new ValidationError("Amount must be greater than zero");
    }
    const frequency = VALID_FREQUENCIES.has(body.frequency)
      ? body.frequency
      : "monthly";
    const nextDueDate = String(
      body.next_due_date ?? body.nextDueDate ?? new Date().toISOString().slice(0, 10)
    ).slice(0, 10);

    const created = await this.recurringRepo.create(userId, {
      title: String(body.title).trim(),
      type: body.type === "income" ? "income" : "expense",
      amount,
      frequency,
      nextDueDate,
      category: String(body.category || "Bills & Utilities").trim(),
      wallet: String(body.wallet || "Cash").trim(),
      isActive: body.is_active ?? body.isActive ?? true,
      autoReserve: body.auto_reserve ?? body.autoReserve ?? true,
      notes: String(body.notes || "").trim(),
    });
    return created.toJSON();
  }

  async updateRecurring(id, userId, body) {
    if (!id) throw new ValidationError("Recurring item ID is required");
    const patch = {};

    if (body.title !== undefined) {
      if (!String(body.title).trim()) {
        throw new ValidationError("Title cannot be empty");
      }
      patch.title = String(body.title).trim();
    }
    if (body.type !== undefined) {
      patch.type = body.type === "income" ? "income" : "expense";
    }
    if (body.amount !== undefined) {
      const amount = Math.round(Number(body.amount) || 0);
      if (amount <= 0) throw new ValidationError("Amount must be greater than zero");
      patch.amount = amount;
    }
    if (body.frequency !== undefined) {
      if (!VALID_FREQUENCIES.has(body.frequency)) {
        throw new ValidationError("Invalid frequency");
      }
      patch.frequency = body.frequency;
    }
    if (body.next_due_date !== undefined || body.nextDueDate !== undefined) {
      patch.nextDueDate = String(body.nextDueDate ?? body.next_due_date).slice(0, 10);
    }
    if (body.category !== undefined) {
      patch.category = String(body.category || "Bills & Utilities").trim();
    }
    if (body.wallet !== undefined) {
      patch.wallet = String(body.wallet || "Cash").trim();
    }
    if (body.is_active !== undefined || body.isActive !== undefined) {
      patch.isActive = Boolean(body.isActive ?? body.is_active);
    }
    if (body.auto_reserve !== undefined || body.autoReserve !== undefined) {
      patch.autoReserve = Boolean(body.autoReserve ?? body.auto_reserve);
    }
    if (body.notes !== undefined) {
      patch.notes = String(body.notes || "").trim();
    }

    const updated = await this.recurringRepo.update(id, userId, patch);
    return updated.toJSON();
  }

  async processRecurringCycle(id, userId, action = "log") {
    if (!id) throw new ValidationError("Recurring item ID is required");
    const existing = await this.recurringRepo.findById(id, userId);
    if (!existing) throw new NotFoundError("Recurring item not found");

    let loggedTransaction = null;
    if (action === "log") {
      const createdTx = await this.transactionRepo.create(userId, {
        type: existing.type,
        amount: existing.amount,
        created_at: new Date().toISOString(),
        transaction: {
          note: existing.title,
          payee: existing.title,
          category: { key: existing.category, name: existing.category },
          wallet: { key: existing.wallet, name: existing.wallet },
          recurring_id: existing.id,
        },
      });
      loggedTransaction = createdTx.toJSON();
    }

    const nextDueDate = RecurringItemEntity.computeNextDueDate(
      existing.nextDueDate,
      existing.frequency
    );
    const updatedItem = await this.recurringRepo.update(id, userId, {
      nextDueDate,
    });

    return {
      item: updatedItem.toJSON(),
      transaction: loggedTransaction,
    };
  }

  async deleteRecurring(id, userId) {
    if (!id) throw new ValidationError("Recurring item ID is required");
    return this.recurringRepo.delete(id, userId);
  }

  // -------------------- Fund Plan & Overview --------------------

  async updatePlan(userId, body) {
    const existing = await this.fundPlanRepo.findForUser(userId);
    const needsPercent = Math.round(
      Number(body.needs_percent ?? body.needsPercent ?? existing.needsPercent)
    );
    const wantsPercent = Math.round(
      Number(body.wants_percent ?? body.wantsPercent ?? existing.wantsPercent)
    );
    const savingsPercent = Math.round(
      Number(body.savings_percent ?? body.savingsPercent ?? existing.savingsPercent)
    );

    if (needsPercent < 0 || wantsPercent < 0 || savingsPercent < 0) {
      throw new ValidationError("Allocation percentages cannot be negative");
    }
    if (needsPercent + wantsPercent + savingsPercent !== 100) {
      throw new ValidationError(
        "Needs, Wants, and Savings percentages must add up to 100%"
      );
    }

    const monthlyIncomeTarget = Math.max(
      0,
      Math.round(
        Number(
          body.monthly_income_target ??
            body.monthlyIncomeTarget ??
            existing.monthlyIncomeTarget
        ) || 0
      )
    );
    const reserveBuffer = Math.max(
      0,
      Math.round(
        Number(body.reserve_buffer ?? body.reserveBuffer ?? existing.reserveBuffer) ||
          0
      )
    );
    const categoryBuckets =
      body.category_buckets ?? body.categoryBuckets ?? existing.categoryBuckets ?? {};

    const saved = await this.fundPlanRepo.upsert(userId, {
      monthlyIncomeTarget,
      needsPercent,
      wantsPercent,
      savingsPercent,
      reserveBuffer,
      categoryBuckets,
    });
    return saved.toJSON();
  }

  async getOverview(userId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const [planEntity, goalEntities, recurringEntities, monthTransactions, categories] =
      await Promise.all([
        this.fundPlanRepo.findForUser(userId),
        this.fundGoalRepo.findAllForUser(userId),
        this.recurringRepo.findAllForUser(userId),
        this.transactionRepo.findInDateRange(
          userId,
          monthStart.toISOString(),
          monthEnd.toISOString(),
          null
        ),
        this.categoryRepo.findAllForUser(userId),
      ]);

    const plan = planEntity.toJSON();
    const goals = goalEntities.map((g) => g.toJSON());
    const recurring = recurringEntities.map((r) => r.toJSON());

    // Goals summary
    const activeGoals = goals.filter((g) => g.status === "active");
    const completedGoals = goals.filter((g) => g.status === "completed");
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
    const totalMonthlyContribution = activeGoals.reduce(
      (s, g) => s + g.monthly_contribution,
      0
    );

    const goalsSummary = {
      totalTarget,
      totalSaved,
      totalRemaining: Math.max(0, totalTarget - totalSaved),
      totalMonthlyContribution,
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      overallProgressPercent:
        totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0,
    };

    // Recurring summary
    const activeRecurring = recurring.filter((r) => r.is_active);
    const monthlyIncome = activeRecurring
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + r.monthly_equivalent, 0);
    const monthlyExpense = activeRecurring
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + r.monthly_equivalent, 0);
    const committedMonthlyBills = activeRecurring
      .filter((r) => r.type === "expense" && r.auto_reserve)
      .reduce((s, r) => s + r.monthly_equivalent, 0);

    const currentMonthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const dueThisMonthExpense = activeRecurring
      .filter(
        (r) =>
          r.type === "expense" &&
          r.auto_reserve &&
          (r.next_due_date.startsWith(currentMonthKey) || r.days_until_due < 0)
      )
      .reduce((s, r) => s + r.amount, 0);
    const dueThisMonthIncome = activeRecurring
      .filter(
        (r) =>
          r.type === "income" && r.next_due_date.startsWith(currentMonthKey)
      )
      .reduce((s, r) => s + r.amount, 0);
    const overdueCount = activeRecurring.filter((r) => r.days_until_due < 0).length;
    const dueSoonCount = activeRecurring.filter(
      (r) => r.days_until_due >= 0 && r.days_until_due <= 7
    ).length;

    const recurringSummary = {
      monthlyIncome,
      monthlyExpense,
      netMonthlyRecurring: monthlyIncome - monthlyExpense,
      committedMonthlyBills,
      dueThisMonthExpense,
      dueThisMonthIncome,
      overdueCount,
      dueSoonCount,
    };

    // Actual month income/expense (excluding transfers)
    let actualIncomeThisMonth = 0;
    let actualExpenseThisMonth = 0;
    for (const tx of monthTransactions) {
      if (tx.type === "income") actualIncomeThisMonth += tx.amount;
      else if (tx.type === "expense") actualExpenseThisMonth += tx.amount;
    }

    const totalCategoryBudgets = categories
      .filter((c) => c.type !== "income")
      .reduce((s, c) => s + (Number(c.monthlyBudget) || 0), 0);

    // Determine effective planned monthly income basis
    let incomeSource = "none";
    let plannedIncome = 0;
    if (plan.monthly_income_target > 0) {
      plannedIncome = plan.monthly_income_target;
      incomeSource = "plan";
    } else if (monthlyIncome > 0) {
      plannedIncome = monthlyIncome;
      incomeSource = "recurring";
    } else if (actualIncomeThisMonth > 0) {
      plannedIncome = actualIncomeThisMonth;
      incomeSource = "actual";
    }

    const totalReserved =
      committedMonthlyBills + totalMonthlyContribution + plan.reserve_buffer;
    const freeToAllocate =
      plannedIncome - totalCategoryBudgets - totalMonthlyContribution - plan.reserve_buffer;

    // Free to spend: remaining room after actual spending, upcoming unpaid bills, goal contributions & reserve
    const incomeBasisForSpend = Math.max(plannedIncome, actualIncomeThisMonth);
    const freeToSpend =
      incomeBasisForSpend -
      actualExpenseThisMonth -
      dueThisMonthExpense -
      totalMonthlyContribution -
      plan.reserve_buffer;

    // Classify category budgets into needs/wants based on user's bucket map (defaults to wants unless Bills/Groceries/Health)
    const defaultNeedsNames = new Set([
      "Bills & Utilities",
      "Groceries",
      "Health",
      "Rent",
      "Utilities",
    ]);
    let categoryNeedsBudget = 0;
    let categoryWantsBudget = 0;
    for (const cat of categories) {
      if (cat.type === "income") continue;
      const budget = Number(cat.monthlyBudget) || 0;
      if (budget <= 0) continue;
      const bucket =
        plan.category_buckets?.[cat.name] ||
        (defaultNeedsNames.has(cat.name) ? "needs" : "wants");
      if (bucket === "needs") categoryNeedsBudget += budget;
      else if (bucket === "wants") categoryWantsBudget += budget;
    }

    const allocationBuckets = {
      needs: {
        targetPercent: plan.needs_percent,
        targetAmount: Math.round((plannedIncome * plan.needs_percent) / 100),
        plannedAmount: committedMonthlyBills + categoryNeedsBudget,
      },
      wants: {
        targetPercent: plan.wants_percent,
        targetAmount: Math.round((plannedIncome * plan.wants_percent) / 100),
        plannedAmount: categoryWantsBudget,
      },
      savings: {
        targetPercent: plan.savings_percent,
        targetAmount: Math.round((plannedIncome * plan.savings_percent) / 100),
        plannedAmount: totalMonthlyContribution + plan.reserve_buffer,
      },
    };

    // Debts & loans summary across all historical transactions
    const allUserTxns = await this.transactionRepo.findInDateRange(
      userId,
      null,
      null,
      null
    );
    const personMap = new Map();
    let totalLent = 0;
    let totalBorrowed = 0;
    let totalSettled = 0;

    for (const tx of allUserTxns) {
      const meta = tx.meta || tx.transaction || {};
      const isSplit = Boolean(meta.is_split ?? tx.is_split);
      const person = (meta.split_person || tx.split_person || "").trim();
      if (!isSplit || !person) continue;

      const splitType =
        meta.split_type ||
        tx.split_type ||
        (tx.type === "income" ? "settlement" : "lent");
      const isSettled = Boolean(meta.settled ?? tx.settled);

      if (!personMap.has(person)) {
        personMap.set(person, {
          person,
          lent: 0,
          borrowed: 0,
          settled: 0,
          balance: 0,
          transactionCount: 0,
          transactions: [],
          lastDate: tx.createdAt,
        });
      }

      const pEntry = personMap.get(person);
      pEntry.transactionCount += 1;
      pEntry.transactions.push({
        id: tx.id,
        date: tx.createdAt,
        amount: tx.amount,
        type: splitType,
        note: meta.note || meta.payee || tx.note,
        settled: isSettled,
      });

      if (splitType === "lent") {
        if (!isSettled) {
          totalLent += tx.amount;
          pEntry.lent += tx.amount;
          pEntry.balance += tx.amount;
        } else {
          totalSettled += tx.amount;
          pEntry.settled += tx.amount;
        }
      } else if (splitType === "borrowed") {
        if (!isSettled) {
          totalBorrowed += tx.amount;
          pEntry.borrowed += tx.amount;
          pEntry.balance -= tx.amount;
        } else {
          totalSettled += tx.amount;
          pEntry.settled += tx.amount;
        }
      } else if (splitType === "settlement") {
        totalSettled += tx.amount;
        pEntry.settled += tx.amount;
        pEntry.balance -= tx.amount;
      }
    }

    const debtsByPerson = Array.from(personMap.values())
      .map((p) => ({
        ...p,
        status:
          p.balance > 0 ? "owes_you" : p.balance < 0 ? "you_owe" : "settled",
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const debtsSummary = {
      totalLent,
      totalBorrowed,
      totalSettled,
      netBalance: totalLent - totalBorrowed,
      contactsCount: debtsByPerson.length,
      byPerson: debtsByPerson,
    };

    return {
      plan,
      goals,
      goalsSummary,
      recurring,
      recurringSummary,
      debtsSummary,
      cashflow: {
        incomeSource,
        plannedIncome,
        actualIncomeThisMonth,
        actualExpenseThisMonth,
        committedRecurringBills: committedMonthlyBills,
        dueThisMonthExpense,
        plannedGoalSavings: totalMonthlyContribution,
        totalCategoryBudgets,
        reserveBuffer: plan.reserve_buffer,
        totalReserved,
        freeToAllocate,
        freeToSpend,
        allocationBuckets,
      },
    };
  }

  async recordDebtRepayment(userId, body) {
    const contact = String(body.contact || "").trim();
    if (!contact) throw new ValidationError("Contact name is required");
    const amount = Math.round(Number(body.amount) || 0);
    if (amount <= 0) throw new ValidationError("Amount must be greater than zero");
    const direction =
      body.direction === "repayment_sent"
        ? "repayment_sent"
        : "repayment_received";
    const type = direction === "repayment_received" ? "income" : "expense";
    const wallet = String(body.wallet || "Cash").trim();
    const note = String(
      body.note ||
        (direction === "repayment_received"
          ? `Settlement repayment from ${contact}`
          : `Settlement repayment to ${contact}`)
    ).trim();

    const created = await this.transactionRepo.create(userId, {
      type,
      amount,
      created_at: new Date().toISOString(),
      transaction: {
        payee: contact,
        note,
        category: { key: "Debt Settlement", name: "Debt Settlement" },
        wallet: { key: wallet, name: wallet },
        is_split: true,
        split_person: contact,
        split_type: "settlement",
        settled: true,
      },
    });

    return created.toJSON();
  }
}

