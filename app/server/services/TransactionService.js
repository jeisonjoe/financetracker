import { ValidationError } from "../domain/errors.js";

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

    const categoryName =
      typeof rawMeta.category === "string"
        ? rawMeta.category
        : rawMeta.category?.name || body.category || "Uncategorized";

    const transaction = {
      ...rawMeta,
      note: rawMeta.note ?? body.note ?? "",
      payee: rawMeta.payee ?? body.payee ?? rawMeta.note ?? body.note ?? "",
      time: rawMeta.time ?? body.time ?? "",
      category: { key: categoryName, name: categoryName },
      wallet: { key: walletName, name: walletName },
    };

    return {
      type,
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
}

