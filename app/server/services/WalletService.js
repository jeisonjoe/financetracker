import { ValidationError } from "../domain/errors.js";

const DEFAULT_WALLETS = [
  { name: "HDFC Debit Card", type: "debit" },
  { name: "SBI Debit Card", type: "debit" },
  { name: "Cash", type: "cash" },
  { name: "Google Pay", type: "digital" },
];

/**
 * Application service for wallet management and default seeding.
 */
export class WalletService {
  constructor(walletRepo) {
    this.walletRepo = walletRepo;
  }

  async list(userId) {
    const wallets = await this.walletRepo.seedDefaultsIfEmpty(
      userId,
      DEFAULT_WALLETS
    );
    return wallets.map((w) => w.toJSON());
  }

  async create(userId, { name, type = "debit", opening_balance = 0, openingBalance }) {
    if (!name || !String(name).trim()) {
      throw new ValidationError("Wallet name is required");
    }
    const rawOpening = openingBalance ?? opening_balance ?? 0;
    const numericOpening = Number(rawOpening);
    if (!Number.isFinite(numericOpening)) {
      throw new ValidationError("Opening balance must be a valid number");
    }
    const created = await this.walletRepo.create(userId, {
      name: String(name),
      type,
      openingBalance: Math.round(numericOpening),
    });
    return created.toJSON();
  }

  async update(id, userId, payload) {
    if (!id) throw new ValidationError("Wallet ID is required");
    const patch = {};
    if (payload.name !== undefined) {
      if (!String(payload.name).trim()) {
        throw new ValidationError("Wallet name cannot be empty");
      }
      patch.name = String(payload.name);
    }
    if (payload.type !== undefined) {
      patch.type = String(payload.type);
    }
    if (payload.opening_balance !== undefined || payload.openingBalance !== undefined) {
      const rawOpening = payload.openingBalance ?? payload.opening_balance;
      const numericOpening = Number(rawOpening);
      if (!Number.isFinite(numericOpening)) {
        throw new ValidationError("Opening balance must be a valid number");
      }
      patch.openingBalance = Math.round(numericOpening);
    }

    const updated = await this.walletRepo.update(id, userId, patch);
    return updated.toJSON();
  }

  async remove(id, userId) {
    if (!id) throw new ValidationError("Wallet ID is required");
    return this.walletRepo.delete(id, userId);
  }
}

