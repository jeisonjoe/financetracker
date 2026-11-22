import { ValidationError } from "../domain/errors.js";

const DEFAULT_CATEGORIES = [
  {
    name: "Food & Dining",
    type: "expense",
    icon: { name: "BiRestaurant" },
    subcategories: ["Breakfast", "Lunch", "Dinner", "Cafes & Fast Food", "Groceries & Snacks"],
  },
  {
    name: "Travel",
    type: "expense",
    icon: { name: "BiCar" },
    subcategories: ["Petrol & Fuel", "Bus & Transit", "Train", "Flight", "Taxi & Cab"],
  },
  {
    name: "Bills & Utilities",
    type: "expense",
    icon: { name: "BiReceipt" },
    subcategories: ["Electricity", "Water", "Mobile & Internet", "House Rent", "Piped Gas"],
  },
  {
    name: "Shopping",
    type: "expense",
    icon: { name: "BiShoppingBag" },
    subcategories: ["Clothing", "Electronics", "Home & Kitchen", "Personal Care"],
  },
  {
    name: "Groceries",
    type: "expense",
    icon: { name: "BiCart" },
    subcategories: ["Fresh Produce", "Dairy & Bakery", "Packaged Food", "Household Supplies"],
  },
  {
    name: "Entertainment",
    type: "expense",
    icon: { name: "BiMoviePlay" },
    subcategories: ["Movies & Events", "Streaming & OTT", "Gaming", "Outings & Hobbies"],
  },
  {
    name: "Health",
    type: "expense",
    icon: { name: "BiPlusMedical" },
    subcategories: ["Medicines & Pharmacy", "Doctor & Hospital", "Fitness & Gym", "Diagnostics & Lab"],
  },
  {
    name: "Investment",
    type: "expense",
    icon: { name: "BiTrendingUp" },
    subcategories: ["Mutual Funds & SIP", "Stocks & Equity", "Fixed Deposits", "Gold & Sovereign Bonds"],
  },
  {
    name: "Salary",
    type: "income",
    icon: { name: "BiWallet" },
    subcategories: ["Monthly Salary", "Bonus & Ex-Gratia", "Freelance & Consulting", "Interest & Dividends"],
  },
  {
    name: "Transfer",
    type: "both",
    icon: { name: "BiTransfer" },
    subcategories: ["Self Transfer", "Account Deposit", "Wallet Top-Up"],
  },
];

/**
 * Application service for category management and default seeding.
 */
export class CategoryService {
  constructor(categoryRepo, transactionRepo = null) {
    this.categoryRepo = categoryRepo;
    this.transactionRepo = transactionRepo;
  }

  async list(userId) {
    const categories = await this.categoryRepo.seedDefaultsIfEmpty(
      userId,
      DEFAULT_CATEGORIES
    );
    return categories.map((cat) => cat.toJSON());
  }

  async create(userId, { name, parent_id = null, parentId = null, type = "expense", icon = null, monthly_budget = 0 }) {
    if (!name || !String(name).trim()) {
      throw new ValidationError("Category name is required");
    }
    const resolvedParentId = parent_id ?? parentId ?? null;
    const created = await this.categoryRepo.create(userId, {
      name: String(name),
      parentId: resolvedParentId,
      type,
      icon,
      monthlyBudget: monthly_budget,
    });
    return created.toJSON();
  }

  async update(id, userId, payload) {
    if (!id) throw new ValidationError("Category ID is required");
    const updated = await this.categoryRepo.update(id, userId, {
      name: payload.name,
      parentId: payload.parent_id !== undefined ? payload.parent_id : payload.parentId,
      type: payload.type,
      icon: payload.icon,
      monthlyBudget: payload.monthly_budget ?? payload.monthlyBudget,
    });
    return updated.toJSON();
  }

  async remove(id, userId) {
    if (!id) throw new ValidationError("Category ID is required");
    return this.categoryRepo.delete(id, userId);
  }

  async mergeCategories(userId, sourceId, targetId) {
    if (!sourceId || !targetId) {
      throw new ValidationError("Source and target category IDs are required");
    }
    if (String(sourceId) === String(targetId)) {
      throw new ValidationError("Source and target categories must be different");
    }

    const categories = await this.categoryRepo.findAllForUser(userId);
    const source = categories.find((c) => String(c.id) === String(sourceId));
    const target = categories.find((c) => String(c.id) === String(targetId));

    if (!source) throw new NotFoundError("Source category not found");
    if (!target) throw new NotFoundError("Target category not found");

    // 1. Move any subcategories of source to target
    const children = categories.filter(
      (c) => String(c.parentId) === String(source.id)
    );
    for (const child of children) {
      await this.categoryRepo.update(child.id, userId, { parentId: target.id });
    }

    // 2. If transactionRepo is present, migrate all transactions referencing source.name to target.name
    if (this.transactionRepo) {
      const allTxns = await this.transactionRepo.findInDateRange(
        userId,
        null,
        null,
        null
      );
      for (const tx of allTxns) {
        let changed = false;
        const meta = { ...(tx.meta || {}) };
        if (
          tx.category?.name === source.name ||
          meta.category?.name === source.name
        ) {
          meta.category = { key: target.name, name: target.name };
          changed = true;
        }
        if (
          tx.subcategory?.name === source.name ||
          meta.subcategory?.name === source.name
        ) {
          meta.subcategory = null;
          changed = true;
        }
        if (Array.isArray(meta.splits)) {
          meta.splits = meta.splits.map((s) => {
            const sName =
              typeof s.category === "string" ? s.category : s.category?.name;
            if (sName === source.name) {
              changed = true;
              return { ...s, category: { key: target.name, name: target.name } };
            }
            return s;
          });
        }
        if (changed) {
          await this.transactionRepo.update(tx.id, userId, {
            type: tx.type,
            amount: tx.amount,
            created_at: tx.createdAt,
            transaction: meta,
          });
        }
      }
    }

    // 3. Delete source category
    await this.categoryRepo.delete(source.id, userId);
    return { success: true, sourceName: source.name, targetName: target.name };
  }
}

