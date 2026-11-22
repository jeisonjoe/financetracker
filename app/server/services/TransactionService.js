import { ValidationError } from "../domain/errors.js";
import { MerchantRuleService } from "./MerchantRuleService.js";

/**
 * Application service for transaction CRUD and bulk import operations.
 */
export class TransactionService {
  constructor(transactionRepo) {
    this.transactionRepo = transactionRepo;
  }

  normalizePayload(body) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError("Amount must be greater than zero");
    }

    const type =
      body.type === "income" || body.type === "transfer" ? body.type : "expense";
    const createdAt = body.created_at
      ? new Date(body.created_at)
      : new Date();
    if (Number.isNaN(createdAt.getTime())) {
      throw new ValidationError("Invalid transaction date");
    }

    const rawMeta = body.transaction || {};
    const walletName =
      typeof rawMeta.wallet === "string"
        ? rawMeta.wallet
        : rawMeta.wallet?.name || body.wallet || "Cash";

    if (type === "transfer") {
      const toWalletName =
        typeof rawMeta.to_wallet === "string"
          ? rawMeta.to_wallet
          : rawMeta.to_wallet?.name || body.to_wallet || "";
      if (!toWalletName || !String(toWalletName).trim()) {
        throw new ValidationError("Destination wallet is required for transfers");
      }
      if (String(toWalletName).trim() === String(walletName).trim()) {
        throw new ValidationError("Source and destination wallets must be different");
      }

      const defaultLabel = `${walletName} → ${toWalletName}`;
      const note = rawMeta.note ?? body.note ?? "";
      const transaction = {
        ...rawMeta,
        note: note || defaultLabel,
        payee: rawMeta.payee ?? body.payee ?? defaultLabel,
        time: rawMeta.time ?? body.time ?? "",
        category: { key: "Transfer", name: "Transfer" },
        wallet: { key: walletName, name: walletName },
        to_wallet: { key: toWalletName, name: toWalletName },
      };

      return {
        type: "transfer",
        amount: Math.round(amount),
        created_at: createdAt.toISOString(),
        transaction,
      };
    }

    const rawNote = rawMeta.note ?? body.note ?? "";
    const rawPayee = rawMeta.payee ?? body.payee ?? rawNote;
    const cleaned = MerchantRuleService.cleanNarration(rawPayee || rawNote, type);

    const isSplit = Boolean(rawMeta.is_split ?? body.is_split ?? cleaned.isSplit);
    const splitPerson = rawMeta.split_person ?? body.split_person ?? cleaned.splitPerson ?? null;
    const splitType = rawMeta.split_type ?? body.split_type ?? cleaned.splitType ?? (type === "income" ? "settlement" : "lent");
    const settled = Boolean(rawMeta.settled ?? body.settled ?? false);
    const isReversal = Boolean(rawMeta.is_reversal ?? body.is_reversal ?? cleaned.isReversal);
    const reversalRef = rawMeta.reversal_ref ?? body.reversal_ref ?? cleaned.reference ?? "";
    const isSalary = Boolean(rawMeta.is_salary ?? body.is_salary ?? cleaned.isSalary);

    // Tags
    const rawTags = rawMeta.tags ?? body.tags ?? [];
    const tags = Array.isArray(rawTags)
      ? rawTags.map((t) => String(t).trim().replace(/^#/, "")).filter(Boolean)
      : typeof rawTags === "string"
      ? rawTags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
      : [];

    // Multi-category splits
    const rawSplits = rawMeta.splits ?? body.splits ?? [];
    let splits = [];
    if (Array.isArray(rawSplits) && rawSplits.length > 0) {
      splits = rawSplits
        .map((s) => {
          const splitAmount = Math.round(Number(s.amount) || 0);
          const splitCatName =
            typeof s.category === "string"
              ? s.category
              : s.category?.name || "Uncategorized";
          const splitSubName =
            typeof s.subcategory === "string"
              ? s.subcategory
              : s.subcategory?.name || null;
          return {
            category: { key: splitCatName, name: splitCatName },
            ...(splitSubName
              ? { subcategory: { key: splitSubName, name: splitSubName } }
              : {}),
            amount: splitAmount,
            note: s.note ? String(s.note).trim() : "",
          };
        })
        .filter((s) => s.amount > 0);

      if (splits.length > 0) {
        const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(splitSum - Math.round(amount)) > 1) {
          throw new ValidationError(
            `Sum of splits (${splitSum}) does not match total amount (${Math.round(amount)})`
          );
        }
      }
    }

    const isAdjustment = Boolean(rawMeta.is_adjustment ?? body.is_adjustment ?? false);
    const recurringId = rawMeta.recurring_id ?? body.recurring_id ?? null;

    const categoryName =
      typeof rawMeta.category === "string"
        ? rawMeta.category
        : rawMeta.category?.name ||
          body.category ||
          (isReversal ? "Refund / Reversal" : isSalary ? "Salary" : "Uncategorized");

    const rawSubcategory = rawMeta.subcategory ?? body.subcategory ?? null;
    const subcategoryName =
      typeof rawSubcategory === "string"
        ? rawSubcategory
        : rawSubcategory?.name || null;

    const transaction = {
      ...rawMeta,
      note: rawNote || cleaned.note,
      payee: rawPayee ? MerchantRuleService.titleCase(rawPayee) : cleaned.payee,
      time: rawMeta.time ?? body.time ?? "",
      category: { key: categoryName, name: categoryName },
      ...(subcategoryName
        ? { subcategory: { key: subcategoryName, name: subcategoryName } }
        : {}),
      wallet: { key: walletName, name: walletName },
      is_split: isSplit,
      split_person: splitPerson ? MerchantRuleService.titleCase(splitPerson) : null,
      split_type: splitType,
      settled,
      is_reversal: isReversal,
      reversal_ref: reversalRef,
      is_salary: isSalary,
      tags,
      splits,
      is_adjustment: isAdjustment,
      ...(recurringId ? { recurring_id: String(recurringId) } : {}),
    };

    return {
      type: isReversal || isSalary ? "income" : type,
      amount: Math.round(amount),
      created_at: createdAt.toISOString(),
      transaction,
    };
  }

  async list(userId, options) {
    const result = await this.transactionRepo.findByUser(userId, options);
    return {
      items: result.items.map((item) => item.toJSON()),
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  async create(userId, body) {
    const normalized = this.normalizePayload(body);
    const created = await this.transactionRepo.create(userId, normalized);
    return created.toJSON();
  }

  async update(id, userId, body) {
    if (!id) throw new ValidationError("Transaction ID is required");
    const normalized = this.normalizePayload(body);
    const updated = await this.transactionRepo.update(id, userId, normalized);
    return updated.toJSON();
  }

  async remove(id, userId) {
    if (!id) throw new ValidationError("Transaction ID is required");
    return this.transactionRepo.delete(id, userId);
  }

  async bulkImport(userId, transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new ValidationError("No transactions provided for import");
    }
    return this.transactionRepo.bulkUpsertByExternalId(userId, transactions);
  }

  async getExistingExternalIds(userId) {
    const all = await this.transactionRepo.findInDateRange(userId, null, null, null);
    const ids = new Set();
    for (const tx of all || []) {
      const extId = tx.transaction?.external_id;
      if (extId) ids.add(String(extId));
    }
    return ids;
  }
}

