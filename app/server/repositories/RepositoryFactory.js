import { DatabaseConfig } from "../config/DatabaseConfig.js";
import { MySqlAuthProvider } from "./mysql/MySqlAuthProvider.js";
import { MySqlTransactionRepository } from "./mysql/MySqlTransactionRepository.js";
import { MySqlCategoryRepository } from "./mysql/MySqlCategoryRepository.js";
import { MySqlWalletRepository } from "./mysql/MySqlWalletRepository.js";
import { MySqlFundGoalRepository } from "./mysql/MySqlFundGoalRepository.js";
import { MySqlRecurringItemRepository } from "./mysql/MySqlRecurringItemRepository.js";
import { MySqlFundPlanRepository } from "./mysql/MySqlFundPlanRepository.js";
import { MySqlMerchantRuleRepository } from "./mysql/MySqlMerchantRuleRepository.js";
import { SupabaseAuthProvider } from "./supabase/SupabaseAuthProvider.js";
import { SupabaseTransactionRepository } from "./supabase/SupabaseTransactionRepository.js";
import { SupabaseCategoryRepository } from "./supabase/SupabaseCategoryRepository.js";
import { SupabaseWalletRepository } from "./supabase/SupabaseWalletRepository.js";
import { SupabaseFundGoalRepository } from "./supabase/SupabaseFundGoalRepository.js";
import { SupabaseRecurringItemRepository } from "./supabase/SupabaseRecurringItemRepository.js";
import { SupabaseFundPlanRepository } from "./supabase/SupabaseFundPlanRepository.js";
import { SupabaseMerchantRuleRepository } from "./supabase/SupabaseMerchantRuleRepository.js";

/**
 * Abstract Factory that resolves concrete MySQL or Supabase repository
 * implementations based on DB_PROVIDER without exposing persistence details
 * to services or API routes.
 */
export class RepositoryFactory {
  static createForProvider(provider = DatabaseConfig.getProvider()) {
    if (provider === DatabaseConfig.PROVIDERS.SUPABASE) {
      return {
        provider,
        authProvider: new SupabaseAuthProvider(),
        transactionRepo: new SupabaseTransactionRepository(),
        categoryRepo: new SupabaseCategoryRepository(),
        walletRepo: new SupabaseWalletRepository(),
        fundGoalRepo: new SupabaseFundGoalRepository(),
        recurringRepo: new SupabaseRecurringItemRepository(),
        fundPlanRepo: new SupabaseFundPlanRepository(),
        merchantRuleRepo: new SupabaseMerchantRuleRepository(),
      };
    }

    return {
      provider: DatabaseConfig.PROVIDERS.MYSQL,
      authProvider: new MySqlAuthProvider(),
      transactionRepo: new MySqlTransactionRepository(),
      categoryRepo: new MySqlCategoryRepository(),
      walletRepo: new MySqlWalletRepository(),
      fundGoalRepo: new MySqlFundGoalRepository(),
      recurringRepo: new MySqlRecurringItemRepository(),
      fundPlanRepo: new MySqlFundPlanRepository(),
      merchantRuleRepo: new MySqlMerchantRuleRepository(),
    };
  }
}

