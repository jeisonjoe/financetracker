import { ValidationError, NotFoundError } from "../domain/errors.js";

/**
 * Application service for user-configurable merchant auto-categorization rules.
 */
export class RuleService {
  constructor(merchantRuleRepo) {
    this.merchantRuleRepo = merchantRuleRepo;
  }

  async list(userId) {
    const rules = await this.merchantRuleRepo.findAllForUser(userId);
    return rules.map((r) => r.toJSON());
  }

  async create(userId, body) {
    if (!body?.pattern || !String(body.pattern).trim()) {
      throw new ValidationError("Matching pattern is required");
    }
    if (!body?.category || !String(body.category).trim()) {
      throw new ValidationError("Category is required");
    }

    const created = await this.merchantRuleRepo.create(userId, {
      pattern: String(body.pattern).trim(),
      category: String(body.category).trim(),
      subcategory: body.subcategory ? String(body.subcategory).trim() : null,
      payee: body.payee ? String(body.payee).trim() : null,
      defaultNote: body.default_note ?? body.defaultNote ?? null,
      tags: Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean)
        : [],
      isActive: body.is_active ?? body.isActive ?? true,
    });

    return created.toJSON();
  }

  async update(id, userId, body) {
    if (!id) throw new ValidationError("Rule ID is required");
    const updated = await this.merchantRuleRepo.update(id, userId, body);
    return updated.toJSON();
  }

  async remove(id, userId) {
    if (!id) throw new ValidationError("Rule ID is required");
    return this.merchantRuleRepo.delete(id, userId);
  }
}
