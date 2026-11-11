import { RepositoryFactory } from "../repositories/RepositoryFactory.js";
import { AuthService } from "./AuthService.js";
import { TransactionService } from "./TransactionService.js";
import { CategoryService } from "./CategoryService.js";
import { WalletService } from "./WalletService.js";
import { AnalyticsService } from "./AnalyticsService.js";
import { PlanningService } from "./PlanningService.js";

/**
 * Dependency injection container assembling services for the active DB_PROVIDER.
 */
export class ServiceContainer {
  static create(provider) {
    const repos = RepositoryFactory.createForProvider(provider);

    return {
      provider: repos.provider,
      authService: new AuthService(repos.authProvider),
      transactionService: new TransactionService(repos.transactionRepo),
      categoryService: new CategoryService(repos.categoryRepo),
      walletService: new WalletService(repos.walletRepo),
      analyticsService: new AnalyticsService(
        repos.transactionRepo,
        repos.categoryRepo,
        repos.walletRepo
      ),
      planningService: new PlanningService(
        repos.fundGoalRepo,
        repos.recurringRepo,
        repos.fundPlanRepo,
        repos.transactionRepo,
        repos.categoryRepo
      ),
    };
  }
}

