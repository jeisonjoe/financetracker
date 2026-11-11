import { ValidationError } from "../domain/errors.js";

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", type: "expense" },
  { name: "Shopping", type: "expense" },
  { name: "Travel", type: "expense" },
  { name: "Bills & Utilities", type: "expense" },
  { name: "Groceries", type: "expense" },
  { name: "Entertainment", type: "expense" },
  { name: "Health", type: "expense" },
  { name: "Investment", type: "expense" },
  { name: "Transfer", type: "both" },
  { name: "Salary", type: "income" },
];

/**
 * Application service for category management and default seeding.
 */
export class CategoryService {
  constructor(categoryRepo) {
    this.categoryRepo = categoryRepo;
  }

  async list(userId) {
    const categories = await this.categoryRepo.seedDefaultsIfEmpty(
      userId,
      DEFAULT_CATEGORIES
    );
    return categories.map((cat) => cat.toJSON());
  }

  async create(userId, { name, type = "expense", icon = null, monthly_budget = 0 }) {
    if (!name || !String(name).trim()) {
      throw new ValidationError("Category name is required");
    }
    const created = await this.categoryRepo.create(userId, {
      name: String(name),
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
}

