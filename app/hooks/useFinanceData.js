"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AnalyticsApi,
  CategoryApi,
  PlanningApi,
  TransactionApi,
  WalletApi,
} from "@/app/services/ApiClient";

export const FINANCE_QUERY_KEYS = {
  analytics: (period) => ["analytics", period],
  transactions: (filters) => ["transactions", filters],
  categories: ["categories"],
  wallets: ["wallets"],
  planning: ["planning"],
};

export function useAnalytics(period = "this_month") {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.analytics(period),
    queryFn: () => AnalyticsApi.getOverview(period),
  });
}

export function usePlanningOverview() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.planning,
    queryFn: () => PlanningApi.getOverview(),
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.categories,
    queryFn: () => CategoryApi.list(),
  });
}

export function useWalletsQuery() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.wallets,
    queryFn: () => WalletApi.list(),
  });
}

export function useTransactionsInfinite({
  pageSize = 20,
  type = "",
  search = "",
  wallet = "",
  category = "",
} = {}) {
  const filters = { pageSize, type, search, wallet, category };
  return useInfiniteQuery({
    queryKey: FINANCE_QUERY_KEYS.transactions(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      TransactionApi.list({
        page: pageParam,
        pageSize,
        type,
        search,
        wallet,
        category,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.hasMore ? allPages.length : undefined,
  });
}

export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.wallets });
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.planning });
  };

  const createTransaction = useMutation({
    mutationFn: (payload) => TransactionApi.create(payload),
    onSuccess: invalidateAll,
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, payload }) => TransactionApi.update(id, payload),
    onSuccess: invalidateAll,
  });

  const deleteTransaction = useMutation({
    mutationFn: (id) => TransactionApi.remove(id),
    onSuccess: invalidateAll,
  });

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    invalidateAll,
  };
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.categories });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const createCategory = useMutation({
    mutationFn: (payload) => CategoryApi.create(payload),
    onSuccess: invalidate,
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, payload }) => CategoryApi.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteCategory = useMutation({
    mutationFn: (id) => CategoryApi.remove(id),
    onSuccess: invalidate,
  });

  return { createCategory, updateCategory, deleteCategory };
}

export function useWalletMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.wallets });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const createWallet = useMutation({
    mutationFn: (payload) => WalletApi.create(payload),
    onSuccess: invalidate,
  });

  const updateWallet = useMutation({
    mutationFn: ({ id, payload }) => WalletApi.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteWallet = useMutation({
    mutationFn: (id) => WalletApi.remove(id),
    onSuccess: invalidate,
  });

  return { createWallet, updateWallet, deleteWallet };
}

export function usePlanningMutations() {
  const queryClient = useQueryClient();

  const invalidatePlanning = () => {
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.planning });
  };

  const invalidateWithTransactions = () => {
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.planning });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.wallets });
  };

  const updatePlan = useMutation({
    mutationFn: (payload) => PlanningApi.updatePlan(payload),
    onSuccess: invalidatePlanning,
  });

  const createGoal = useMutation({
    mutationFn: (payload) => PlanningApi.createGoal(payload),
    onSuccess: invalidatePlanning,
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, payload }) => PlanningApi.updateGoal(id, payload),
    onSuccess: invalidatePlanning,
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => PlanningApi.deleteGoal(id),
    onSuccess: invalidatePlanning,
  });

  const createRecurring = useMutation({
    mutationFn: (payload) => PlanningApi.createRecurring(payload),
    onSuccess: invalidatePlanning,
  });

  const updateRecurring = useMutation({
    mutationFn: ({ id, payload }) => PlanningApi.updateRecurring(id, payload),
    onSuccess: invalidatePlanning,
  });

  const processRecurring = useMutation({
    mutationFn: ({ id, action }) => PlanningApi.processRecurring(id, action),
    onSuccess: invalidateWithTransactions,
  });

  const deleteRecurring = useMutation({
    mutationFn: (id) => PlanningApi.deleteRecurring(id),
    onSuccess: invalidatePlanning,
  });

  return {
    updatePlan,
    createGoal,
    updateGoal,
    deleteGoal,
    createRecurring,
    updateRecurring,
    processRecurring,
    deleteRecurring,
  };
}

