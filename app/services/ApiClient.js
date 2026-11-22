/**
 * Base HTTP client encapsulating fetch requests and consistent error extraction.
 */
class HttpClient {
  async request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed (${response.status})`);
    }
    return payload;
  }

  get(url) {
    return this.request(url, { method: "GET" });
  }

  post(url, body) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });
  }

  patch(url, body) {
    return this.request(url, {
      method: "PATCH",
      body: JSON.stringify(body ?? {}),
    });
  }

  delete(url) {
    return this.request(url, { method: "DELETE" });
  }
}

const http = new HttpClient();

export const AuthApi = {
  getSession: () => http.get("/api/auth/session"),
  login: (email, password) => http.post("/api/auth/login", { email, password }),
  signup: (payload) => http.post("/api/auth/signup", payload),
  logout: () => http.post("/api/auth/logout"),
  forgotPassword: (email) => http.post("/api/auth/forgot-password", { email }),
  resetPassword: (payload) => http.post("/api/auth/reset-password", payload),
  updateProfile: (profile) => http.patch("/api/auth/session", profile),
};

export const TransactionApi = {
  list: ({ page = 0, pageSize = 20, type = "", search = "", wallet = "", category = "", tag = "" } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (type) params.set("type", type);
    if (search) params.set("search", search);
    if (wallet) params.set("wallet", wallet);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    return http.get(`/api/transactions?${params.toString()}`);
  },
  create: (payload) => http.post("/api/transactions", payload),
  update: (id, payload) => http.patch(`/api/transactions/${id}`, payload),
  remove: (id) => http.delete(`/api/transactions/${id}`),
  previewImport: () => http.get("/api/import-data"),
  bulkSave: (transactions) => http.post("/api/save-transactions", { transactions }),
};

export const CategoryApi = {
  list: () => http.get("/api/categories"),
  create: (payload) => http.post("/api/categories", payload),
  update: (id, payload) => http.patch(`/api/categories/${id}`, payload),
  remove: (id) => http.delete(`/api/categories/${id}`),
  merge: (payload) => http.post("/api/categories/merge", payload),
};

export const WalletApi = {
  list: () => http.get("/api/wallets"),
  create: (payload) => http.post("/api/wallets", payload),
  update: (id, payload) => http.patch(`/api/wallets/${id}`, payload),
  remove: (id) => http.delete(`/api/wallets/${id}`),
};

export const RulesApi = {
  list: () => http.get("/api/rules"),
  create: (payload) => http.post("/api/rules", payload),
  update: (id, payload) => http.patch(`/api/rules/${id}`, payload),
  remove: (id) => http.delete(`/api/rules/${id}`),
};

export const AnalyticsApi = {
  getOverview: (period = "this_month") =>
    http.get(`/api/analytics?period=${encodeURIComponent(period)}`),
};

export const PlanningApi = {
  getOverview: () => http.get("/api/planning"),
  updatePlan: (payload) => http.patch("/api/planning", payload),
  listGoals: () => http.get("/api/planning/goals"),
  createGoal: (payload) => http.post("/api/planning/goals", payload),
  updateGoal: (id, payload) => http.patch(`/api/planning/goals/${id}`, payload),
  deleteGoal: (id) => http.delete(`/api/planning/goals/${id}`),
  listRecurring: () => http.get("/api/planning/recurring"),
  createRecurring: (payload) => http.post("/api/planning/recurring", payload),
  updateRecurring: (id, payload) => http.patch(`/api/planning/recurring/${id}`, payload),
  processRecurring: (id, action = "log") =>
    http.post(`/api/planning/recurring/${id}`, { action }),
  deleteRecurring: (id) => http.delete(`/api/planning/recurring/${id}`),
  recordRepayment: (payload) => http.post("/api/planning/debts/repay", payload),
};

export const AiApi = {
  getStatus: () => http.get("/api/ai/status"),
  testConnection: ({ provider, apiKey, model }) =>
    http.post("/api/ai/status", { provider, apiKey, model }),
  generateInsights: ({ period = "this_month", provider, apiKey, model }) =>
    http.post("/api/ai/insights", { period, provider, apiKey, model }),
  parseStatement: async ({ file, password, wallet, provider, apiKey, model, mode }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (password) formData.append("password", password);
    if (wallet) formData.append("wallet", wallet);
    if (provider) formData.append("provider", provider);
    if (model) formData.append("model", model);
    if (apiKey) formData.append("apiKey", apiKey);
    if (mode) formData.append("mode", mode);

    const response = await fetch("/api/ai/parse-statement", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed (${response.status})`);
    }
    return payload;
  },
};

