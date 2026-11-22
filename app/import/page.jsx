"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  BiBot,
  BiCheckCircle,
  BiErrorCircle,
  BiFile,
  BiHide,
  BiShow,
  BiUpload,
} from "react-icons/bi";
import { toast } from "sonner";
import Dropdown from "@/app/components/Dropdown";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  useCategoriesQuery,
  useWalletsQuery,
} from "@/app/hooks/useFinanceData";
import {
  AiApi,
  AnalyticsApi,
  CategoryApi,
  TransactionApi,
  WalletApi,
} from "@/app/services/ApiClient";
import {
  DEFAULT_AI_SETTINGS,
  getActiveAiRequestConfig,
  loadAiSettings,
  saveAiSettings,
} from "@/app/utils/aiSettings";
import { cFormat } from "@/app/utils/currencyFormat";

const IMPORT_TABS = [
  { key: "statement", label: "Bank Statement (AI)" },
  { key: "gpay", label: "Google Pay Activity" },
];

const TYPE_OPTIONS = [
  { key: "expense", name: "Expense" },
  { key: "income", name: "Income" },
  { key: "transfer", name: "Transfer" },
];

export default function ImportPage() {
  const { user, isLoading } = useAuth();
  const currency = user?.currency || "INR";
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useWalletsQuery();
  const { data: categories = [] } = useCategoriesQuery();

  const [mode, setMode] = useState("statement");

  // Shared AI status
  const [mounted, setMounted] = useState(false);
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [envConfigured, setEnvConfigured] = useState({ gemini: false, claude: false });

  // Statement AI importer state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePassword, setFilePassword] = useState("");
  const [showFilePassword, setShowFilePassword] = useState(false);
  const [targetWallet, setTargetWallet] = useState("");
  const [parsingStatement, setParsingStatement] = useState(false);
  const [importingStatement, setImportingStatement] = useState(false);
  const [statementRows, setStatementRows] = useState([]);
  const [statementTotals, setStatementTotals] = useState(null);
  const [statementReconciliation, setStatementReconciliation] = useState(null);
  const [alignWalletBalance, setAlignWalletBalance] = useState(true);
  const [parsingEngine, setParsingEngine] = useState("deterministic"); // "deterministic" (fast) | "ai"
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);
  const [categorizationStats, setCategorizationStats] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statementError, setStatementError] = useState(null);
  const [statementStatus, setStatementStatus] = useState("Select a PDF, CSV, or Excel bank statement to parse.");

  // Legacy Google Pay importer state
  const [gpayTransactions, setGpayTransactions] = useState([]);
  const [gpayStatus, setGpayStatus] = useState("Idle");
  const [gpayError, setGpayError] = useState(null);
  const [gpayBusy, setGpayBusy] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Import Data | FinTrack";
    }
    setMounted(true);
    setAiSettings(loadAiSettings());
    if (user) {
      AiApi.getStatus()
        .then((res) => {
          if (res?.envConfigured) setEnvConfigured(res.envConfigured);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!targetWallet && wallets.length > 0) {
      setTargetWallet(wallets[0].name);
    }
  }, [wallets, targetWallet]);

  const activeAi = getActiveAiRequestConfig(aiSettings);
  const hasKeyForActive =
    mounted &&
    Boolean(
      activeAi.apiKey ||
        (activeAi.provider === "claude" ? envConfigured.claude : envConfigured.gemini)
    );

  const walletOptions = useMemo(() => {
    const names = wallets.map((w) => w.name);
    if (!names.includes("Bank Account")) names.push("Bank Account");
    return names.map((name) => ({ key: name, name }));
  }, [wallets]);

  const existingCategoryNames = useMemo(
    () => new Set(categories.map((c) => c.name.trim().toLowerCase())),
    [categories]
  );

  const selectedRows = useMemo(
    () => statementRows.filter((row) => row.selected),
    [statementRows]
  );

  const newCategoriesToCreate = useMemo(() => {
    const map = new Map();
    for (const row of selectedRows) {
      if (row.type === "transfer") continue;
      const name = String(row.category || "").trim();
      if (!name || name === "Uncategorized") continue;
      if (!existingCategoryNames.has(name.toLowerCase()) && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          name,
          type: row.type === "income" ? "income" : "expense",
        });
      }
    }
    return Array.from(map.values());
  }, [selectedRows, existingCategoryNames]);

  const uncategorizedCount = useMemo(() => {
    return statementRows.filter(
      (r) => !r.category || r.category === "Uncategorized"
    ).length;
  }, [statementRows]);

  const visibleStatementRows = useMemo(() => {
    let result = statementRows;
    if (categoryFilter === "uncategorized") {
      result = result.filter(
        (r) => !r.category || r.category === "Uncategorized"
      );
    } else if (categoryFilter !== "all") {
      result = result.filter(
        (r) => (r.category || "").toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter(
        (r) =>
          (r.payee || "").toLowerCase().includes(q) ||
          (r.note || "").toLowerCase().includes(q) ||
          (r.category || "").toLowerCase().includes(q) ||
          String(r.amount).includes(q)
      );
    }
    return result;
  }, [statementRows, categoryFilter, searchFilter]);

  const handleBatchAssignCategory = (catName) => {
    if (!catName || selectedRows.length === 0) return;
    setStatementRows((prev) =>
      prev.map((row) => (row.selected ? { ...row, category: catName } : row))
    );
    toast.success(`Assigned "${catName}" to ${selectedRows.length} selected items`);
  };

  const handleSelectOnlyUncategorized = () => {
    setStatementRows((prev) =>
      prev.map((row) => ({
        ...row,
        selected: !row.category || row.category === "Uncategorized",
      }))
    );
    setCategoryFilter("uncategorized");
  };

  const handleFilePicked = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setStatementError(null);
    setStatementRows([]);
    setStatementTotals(null);
    setStatementReconciliation(null);
    setCategorizationStats(null);
    setSearchFilter("");
    setCategoryFilter("all");
    const isSpreadsheet = /\.(xls|xlsx|csv)$/i.test(file.name);
    if (isSpreadsheet) {
      setParsingEngine("deterministic");
    }
    setStatementStatus(`Ready to analyze "${file.name}"`);
  };

  const handleAnalyzeStatement = async () => {
    if (!selectedFile) {
      toast.error("Please choose a PDF, CSV, or Excel statement file");
      return;
    }
    setParsingStatement(true);
    setStatementError(null);
    setStatementStatus(
      parsingEngine === "deterministic"
        ? `Parsing "${selectedFile.name}" with fast deterministic bank parser...`
        : `Parsing "${selectedFile.name}" with ${
            activeAi.provider === "claude" ? "Claude" : "Gemini"
          }...`
    );

    try {
      const res = await AiApi.parseStatement({
        file: selectedFile,
        password: filePassword,
        wallet: targetWallet || "Bank Account",
        provider: activeAi.provider,
        apiKey: activeAi.apiKey,
        model: activeAi.model,
        mode: parsingEngine,
      });

      const prepared = (res.transactions || []).map((tx, idx) => ({
        ...tx,
        rowId: `${tx.external_id}_${idx}`,
        selected: !tx.isDuplicate,
      }));
      setStatementRows(prepared);
      setStatementTotals(res.statementTotals || null);
      setStatementReconciliation(res.statementReconciliation || null);
      setCategorizationStats(res.categorizationStats || null);
      setStatementStatus(
        `Extracted ${prepared.length} transactions (${res.duplicateCount || 0} duplicates unchecked).`
      );
      if (prepared.length === 0) {
        toast.info("No transactions were detected in that file.");
      } else {
        const stats = res.categorizationStats;
        if (stats?.aiCount > 0) {
          toast.success(
            `Parsed ${prepared.length} transactions (${stats.ruleCount} by rules, ${stats.aiCount} AI refined)`
          );
        } else if (stats?.aiError) {
          toast.info(
            `Parsed ${prepared.length} transactions via local rules (AI notice: ${stats.aiError})`
          );
        } else {
          toast.success(`Parsed ${prepared.length} transactions`);
        }
      }
    } catch (err) {
      setStatementError(err.message || "Failed to analyze bank statement");
      setStatementStatus("Statement parsing failed");
    } finally {
      setParsingStatement(false);
    }
  };

  const updateRow = (rowId, patch) => {
    setStatementRows((prev) =>
      prev.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row))
    );
  };

  const toggleAllRows = (checked) => {
    setStatementRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  };

  const handleImportStatementRows = async () => {
    if (!user || selectedRows.length === 0) return;
    setImportingStatement(true);
    setStatementError(null);
    setStatementStatus("Importing selected transactions...");

    try {
      if (autoCreateCategories && newCategoriesToCreate.length > 0) {
        for (const cat of newCategoriesToCreate) {
          try {
            await CategoryApi.create({
              name: cat.name,
              type: cat.type,
              monthly_budget: 0,
            });
          } catch {
            // Skip if category already exists or fails non-critically
          }
        }
      }

      const payload = selectedRows.map((tx) => {
        const walletName = tx.wallet || targetWallet || "Bank Account";
        const resolvedCategory =
          tx.type === "transfer"
            ? "Transfer"
            : !autoCreateCategories && !existingCategoryNames.has(String(tx.category || "").toLowerCase())
            ? "Uncategorized"
            : tx.category || "Uncategorized";

        return {
          amount: Number(tx.amount),
          type: tx.type,
          created_at: tx.iso_date,
          transaction: {
            note: tx.note || tx.payee,
            category: { key: resolvedCategory, name: resolvedCategory },
            wallet: { key: walletName, name: walletName },
            payee: tx.payee || tx.note,
            external_id: tx.external_id,
            imported_at: new Date().toISOString(),
            closing_balance: tx.closing_balance ?? null,
            is_split: tx.is_split,
            split_person: tx.split_person,
            split_type: tx.split_type,
            settled: tx.settled,
            is_reversal: tx.is_reversal,
            reversal_ref: tx.reversal_ref,
            is_salary: tx.is_salary,
            is_micro_spend: tx.is_micro_spend,
          },
        };
      });

      const result = await TransactionApi.bulkSave(payload);

      // Auto-align wallet balance so that current wallet balance equals statement closing balance
      if (alignWalletBalance && statementReconciliation?.closingBalance !== undefined) {
        const walletName = targetWallet || "Bank Account";
        const matched = wallets.find(
          (w) => w.name?.toLowerCase() === walletName.toLowerCase()
        );
        if (matched?.id) {
          try {
            const overview = await AnalyticsApi.getOverview("all_time");
            const walletStats = (overview?.wallets || []).find(
              (w) => String(w.id) === String(matched.id) || w.name?.toLowerCase() === walletName.toLowerCase()
            );
            const netFlow = Number(walletStats?.balance || 0) - Number(walletStats?.openingBalance || 0);
            const calibratedOpening = Math.round(statementReconciliation.closingBalance - netFlow);
            await WalletApi.update(matched.id, {
              opening_balance: calibratedOpening,
            });
          } catch {
            // Non-critical
          }
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["planning"] }),
      ]);

      setStatementStatus(
        `Import complete. Added ${result.imported}, updated ${result.updated}.`
      );
      toast.success(
        `Imported ${result.imported} new${result.updated ? `, updated ${result.updated}` : ""} transactions`
      );
      if (result.firstError) {
        setStatementError(`Some rows had errors: ${result.firstError}`);
      }
    } catch (err) {
      setStatementError(err.message || "Failed to save transactions");
      setStatementStatus("Import failed");
    } finally {
      setImportingStatement(false);
    }
  };

  // Legacy Google Pay handlers
  const fetchGpayData = async () => {
    setGpayBusy(true);
    setGpayStatus("Parsing Google Pay activity...");
    setGpayError(null);
    try {
      const data = await TransactionApi.previewImport();
      setGpayTransactions(data.transactions || []);
      setGpayStatus(`Loaded ${data.count} transactions. Ready to import.`);
    } catch (e) {
      setGpayError(e.message);
      setGpayStatus("Failed to load data");
    } finally {
      setGpayBusy(false);
    }
  };

  const startGpayImport = async () => {
    if (!user || gpayTransactions.length === 0) return;
    setGpayBusy(true);
    setGpayStatus("Importing transactions...");
    setGpayError(null);

    const payload = gpayTransactions.map((tx) => ({
      amount: tx.amount,
      type: tx.type,
      created_at: tx.iso_date,
      transaction: {
        note: tx.note,
        category: { key: "Imported", name: "Imported" },
        wallet: { key: tx.wallet, name: tx.wallet },
        payee: tx.payee,
        external_id: tx.external_id,
        imported_at: new Date().toISOString(),
      },
    }));

    try {
      const result = await TransactionApi.bulkSave(payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
      ]);
      setGpayStatus(`Completed. Imported: ${result.imported}, Updated: ${result.updated}`);
      if (result.firstError) {
        setGpayError(`Some items failed. First error: ${result.firstError}`);
      }
    } catch (e) {
      setGpayError(e.message);
      setGpayStatus("Import failed");
    } finally {
      setGpayBusy(false);
    }
  };

  const switchProvider = (nextProvider) => {
    const updated = saveAiSettings({ ...aiSettings, provider: nextProvider });
    setAiSettings(updated);
  };

  const duplicateCount = statementRows.filter((r) => r.isDuplicate).length;

  return (
    <div className="p-4 sm:p-8 bg-app-bg min-h-screen text-ink-primary">
      <div className="max-w-6xl mx-auto bg-surface p-6 sm:p-8 rounded-3xl border border-line-subtle flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-ink-primary">
              Import Financial Data
            </h1>
            <p className="text-sm text-ink-subtle mt-1">
              Parse bank statements (PDF, CSV, Excel) with AI or load Google Pay activity exports.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/preferences"
              className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-line-subtle rounded-full text-xs sm:text-sm text-ink-secondary transition-colors"
            >
              AI Keys
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-line-subtle rounded-full text-xs sm:text-sm text-ink-secondary transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Account & Mode Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface-elevated border border-line-faint text-sm">
          <div>
            <span className="text-ink-subtle">Signed in as: </span>
            <span className="font-normal text-ink-secondary">
              {isLoading ? (
                "Loading..."
              ) : user ? (
                user.email
              ) : (
                <Link href="/" className="text-ink-primary underline">
                  Sign in to import
                </Link>
              )}
            </span>
          </div>

          <div className="flex bg-surface border border-line-subtle p-1 rounded-full gap-1">
            {IMPORT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                  mode === tab.key
                    ? "bg-cta text-cta-ink font-medium"
                    : "text-ink-subtle hover:text-ink-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "statement" ? (
          <div className="flex flex-col gap-5">
            {/* Configuration & Upload Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer?.files?.[0];
                  if (dropped) handleFilePicked(dropped);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="lg:col-span-7 border border-dashed border-line-strong hover:border-line-focus bg-surface-elevated/40 hover:bg-surface-elevated/70 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-colors min-h-[190px]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
                <div className="w-12 h-12 rounded-2xl bg-tint flex items-center justify-center text-ink-secondary">
                  {selectedFile ? <BiFile size={24} /> : <BiUpload size={24} />}
                </div>
                {selectedFile ? (
                  <div>
                    <div className="text-sm font-medium text-ink-primary">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-ink-subtle mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click to choose another file
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-ink-secondary">
                      Drop your bank statement here, or click to browse
                    </div>
                    <div className="text-xs text-ink-subtle mt-1">
                      Supports PDF (.pdf), CSV (.csv), and Excel (.xlsx / .xls) up to 15 MB
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="lg:col-span-5 bg-surface-elevated/40 border border-line-subtle rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-ink-subtle">Destination Wallet</label>
                    <Dropdown
                      options={walletOptions}
                      value={targetWallet || "Bank Account"}
                      onChange={(opt) => setTargetWallet(opt.key)}
                      triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-line-subtle hover:bg-surface-hover rounded-xl px-4 py-2.5 text-sm text-ink-primary cursor-pointer transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-ink-subtle">
                      Statement Password (if encrypted)
                    </label>
                    <div className="flex items-center bg-surface border border-line-subtle rounded-xl px-3.5 py-2 gap-2 focus-within:border-line-focus">
                      <input
                        type={showFilePassword ? "text" : "password"}
                        placeholder="Optional (for protected .xlsx)"
                        value={filePassword}
                        onChange={(e) => setFilePassword(e.target.value)}
                        className="bg-transparent text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFilePassword((v) => !v)}
                        className="text-ink-subtle hover:text-ink-primary cursor-pointer"
                        aria-label="Toggle statement password visibility"
                      >
                        {showFilePassword ? <BiHide size={16} /> : <BiShow size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-ink-subtle">
                      <span>Parser Mode</span>
                      <span
                        suppressHydrationWarning
                        className={`inline-flex items-center gap-1 ${
                          parsingEngine === "deterministic" || hasKeyForActive
                            ? "text-green-100"
                            : "text-red-100"
                        }`}
                      >
                        {parsingEngine === "deterministic" ? (
                          <>
                            <BiCheckCircle size={12} /> Instant (0 tokens)
                          </>
                        ) : hasKeyForActive ? (
                          <>
                            <BiCheckCircle size={12} /> Key ready
                          </>
                        ) : (
                          <>
                            <BiErrorCircle size={12} /> Key missing
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex bg-surface border border-line-subtle p-1 rounded-full gap-1">
                      {[
                        { key: "deterministic", label: "Fast Bank Parser" },
                        { key: "ai", label: "AI Categorizer" },
                      ].map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setParsingEngine(p.key)}
                          className={`flex-1 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                            parsingEngine === p.key
                              ? "bg-tint-active text-ink-primary font-medium"
                              : "text-ink-subtle hover:text-ink-body"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleAnalyzeStatement}
                    disabled={parsingStatement || !selectedFile || !user}
                    className="w-full py-2.5 px-5 rounded-full bg-cta hover:bg-cta-hover text-cta-ink text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <BiBot size={17} />
                    <span>
                      {parsingStatement
                        ? "Analyzing statement..."
                        : parsingEngine === "deterministic"
                        ? "Parse Statement (Instant)"
                        : "Analyze Statement with AI"}
                    </span>
                  </button>
                  {parsingEngine === "ai" && !hasKeyForActive && (
                    <Link
                      href="/dashboard/preferences"
                      className="text-xs text-center text-ink-muted hover:text-ink-primary transition-colors"
                    >
                      Configure Gemini or Claude API key in Preferences →
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Statement Balance Reconciliation Card */}
            {statementReconciliation && (
              <div className="bg-surface-elevated/70 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-primary">
                      Statement Balance Reconciliation
                    </span>
                    {statementReconciliation.isReconciled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-green-10 text-green-100">
                        <BiCheckCircle size={13} />
                        Math Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-red-10 text-red-100">
                        <BiErrorCircle size={13} />
                        Difference Detected
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-subtle">
                    {statementReconciliation.statementSummaryFound
                      ? "Bank Summary Verified"
                      : "Tabular Ledger Math"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface p-3.5 rounded-xl border border-line-subtle">
                    <div className="text-xs text-ink-subtle">Opening Balance</div>
                    <div className="text-base font-medium text-ink-primary mt-1 tabular-nums">
                      {cFormat(statementReconciliation.openingBalance, { currency })}
                    </div>
                  </div>
                  <div className="bg-surface p-3.5 rounded-xl border border-line-subtle">
                    <div className="text-xs text-ink-subtle">
                      Total Debits ({statementReconciliation.debitsCount || 0})
                    </div>
                    <div className="text-base font-medium text-red-100 mt-1 tabular-nums">
                      -{cFormat(statementReconciliation.totalDebits, { currency })}
                    </div>
                  </div>
                  <div className="bg-surface p-3.5 rounded-xl border border-line-subtle">
                    <div className="text-xs text-ink-subtle">
                      Total Credits ({statementReconciliation.creditsCount || 0})
                    </div>
                    <div className="text-base font-medium text-green-100 mt-1 tabular-nums">
                      +{cFormat(statementReconciliation.totalCredits, { currency })}
                    </div>
                  </div>
                  <div className="bg-surface p-3.5 rounded-xl border border-line-subtle">
                    <div className="text-xs text-ink-subtle">Closing Balance</div>
                    <div className="text-base font-medium text-ink-primary mt-1 tabular-nums">
                      {cFormat(statementReconciliation.closingBalance, { currency })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-ink-muted pt-2 border-t border-line-faint gap-3">
                  <span>
                    Math Check: {cFormat(statementReconciliation.openingBalance, { currency })} +{" "}
                    {cFormat(statementReconciliation.totalCredits, { currency })} -{" "}
                    {cFormat(statementReconciliation.totalDebits, { currency })} ={" "}
                    {cFormat(statementReconciliation.calculatedClosing, { currency })}
                  </span>
                  <label className="inline-flex items-center gap-2 text-xs text-ink-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alignWalletBalance}
                      onChange={(e) => setAlignWalletBalance(e.target.checked)}
                      className="accent-ink-primary cursor-pointer"
                    />
                    <span>
                      Auto-align <span className="font-medium text-ink-primary">{targetWallet || "wallet"}</span> balance to match statement closing balance (
                      <span className="font-semibold text-ink-primary">
                        {cFormat(statementReconciliation.closingBalance, { currency })}
                      </span>
                      )
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Status / Error */}
            <div className="text-xs sm:text-sm text-ink-subtle flex flex-wrap items-center justify-between gap-2">
              <span>{statementStatus}</span>
              <div className="flex flex-wrap items-center gap-3">
                {statementTotals && (
                  <span className="text-xs text-ink-muted tabular-nums">
                    Debits: {cFormat(statementTotals.totalDebits, { currency })} · Credits:{" "}
                    {cFormat(statementTotals.totalCredits, { currency })}
                  </span>
                )}
                {statementRows.length > 0 && (
                  <span className="text-ink-secondary tabular-nums">
                    Selected {selectedRows.length} of {statementRows.length}
                  </span>
                )}
              </div>
            </div>

            {statementError && (
              <div className="p-3.5 bg-red-10 text-red-100 text-sm rounded-xl whitespace-pre-wrap">
                {statementError}
              </div>
            )}

            {/* Review Table */}
            {statementRows.length > 0 && (
              <div className="border border-line-subtle rounded-2xl overflow-hidden bg-surface-elevated/40 flex flex-col">
                <div className="bg-surface-elevated px-4 py-3.5 border-b border-line-subtle flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-ink-secondary">
                      <input
                        type="checkbox"
                        checked={
                          statementRows.length > 0 &&
                          selectedRows.length === statementRows.length
                        }
                        onChange={(e) => toggleAllRows(e.target.checked)}
                        className="accent-ink-primary cursor-pointer"
                      />
                      <span>Select all ({statementRows.length})</span>
                    </label>

                    {duplicateCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-tint text-ink-muted text-xs">
                        {duplicateCount} duplicates unchecked
                      </span>
                    )}

                    {newCategoriesToCreate.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-green-10 text-green-100 text-xs">
                        {newCategoriesToCreate.length} new{" "}
                        {newCategoriesToCreate.length === 1 ? "category" : "categories"}
                      </span>
                    )}

                    {categorizationStats && (
                      <span className="px-2.5 py-0.5 rounded-full bg-tint text-ink-secondary text-xs">
                        {categorizationStats.ruleCount} via rules
                        {categorizationStats.aiCount > 0 && ` · ${categorizationStats.aiCount} AI refined`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateCategories}
                        onChange={(e) => setAutoCreateCategories(e.target.checked)}
                        className="accent-ink-primary cursor-pointer"
                      />
                      <span>Auto-create new suggested categories</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleImportStatementRows}
                      disabled={importingStatement || selectedRows.length === 0 || !user}
                      className="px-5 py-2 rounded-full bg-cta hover:bg-cta-hover text-cta-ink text-xs sm:text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {importingStatement
                        ? "Importing..."
                        : `Import Selected (${selectedRows.length})`}
                    </button>
                  </div>
                </div>

                {/* Filter & Batch Actions Bar */}
                <div className="bg-surface/80 px-4 py-2.5 border-b border-line-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                    <input
                      type="text"
                      placeholder="Filter transactions by payee, note, or amount..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="bg-surface-elevated border border-line-subtle rounded-lg px-3 py-1.5 text-xs text-ink-primary placeholder:text-ink-subtle focus:outline-none focus:border-line-focus w-60 sm:w-72"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter("all")}
                        className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                          categoryFilter === "all"
                            ? "bg-tint-active text-ink-primary font-medium"
                            : "text-ink-subtle hover:text-ink-primary"
                        }`}
                      >
                        All ({statementRows.length})
                      </button>
                      {uncategorizedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectOnlyUncategorized}
                          className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                            categoryFilter === "uncategorized"
                              ? "bg-amber-10 text-amber-100 font-medium"
                              : "text-amber-100/90 hover:text-amber-100"
                          }`}
                        >
                          Uncategorized ({uncategorizedCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedRows.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-ink-subtle">Assign to {selectedRows.length} selected:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBatchAssignCategory(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                        className="bg-surface-elevated border border-line-subtle rounded-lg px-2.5 py-1 text-xs text-ink-primary focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>
                          Choose category...
                        </option>
                        {categories.map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="max-h-[480px] overflow-auto scrollbar-minimal">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-ink-subtle bg-surface border-b border-line-subtle sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-normal w-10">Use</th>
                        <th className="px-4 py-3 font-normal">Date</th>
                        <th className="px-4 py-3 font-normal">Payee &amp; Note</th>
                        <th className="px-4 py-3 font-normal">Type</th>
                        <th className="px-4 py-3 font-normal">Category</th>
                        <th className="px-4 py-3 font-normal text-right">Amount</th>
                        <th className="px-4 py-3 font-normal text-right whitespace-nowrap">Closing Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStatementRows.map((row) => {
                        const isNewCat =
                          row.type !== "transfer" &&
                          row.category &&
                          row.category !== "Uncategorized" &&
                          !existingCategoryNames.has(row.category.toLowerCase());

                        return (
                          <tr
                            key={row.rowId}
                            className={`border-b border-line-faint last:border-b-0 transition-colors ${
                              row.selected ? "hover:bg-tint-subtle" : "opacity-55"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(e) =>
                                  updateRow(row.rowId, { selected: e.target.checked })
                                }
                                className="accent-ink-primary cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted tabular-nums">
                              {row.date}
                              {row.isDuplicate && (
                                <span className="block text-[10px] text-ink-faint">
                                  Already in ledger
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 min-w-[200px]">
                              <input
                                type="text"
                                value={row.payee}
                                onChange={(e) =>
                                  updateRow(row.rowId, { payee: e.target.value })
                                }
                                className="w-full bg-transparent text-sm text-ink-primary focus:outline-none border-b border-transparent focus:border-line-focus"
                              />
                              <input
                                type="text"
                                value={row.note}
                                onChange={(e) =>
                                  updateRow(row.rowId, { note: e.target.value })
                                }
                                placeholder="Note"
                                className="w-full bg-transparent text-xs text-ink-subtle focus:outline-none mt-0.5"
                              />
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {row.is_reversal && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-tint text-ink-secondary">
                                    Reversal Refund
                                  </span>
                                )}
                                {row.is_split && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-tint-active text-ink-primary font-medium">
                                    {row.split_type === "settlement" ? "Repayment" : "Lent"}: {row.split_person}
                                  </span>
                                )}
                                {row.is_salary && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-10 text-green-100">
                                    Salary
                                  </span>
                                )}
                                {row.is_micro_spend && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] text-ink-subtle bg-surface border border-line-faint">
                                    ≤ {cFormat(200, { currency })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={row.type}
                                onChange={(e) =>
                                  updateRow(row.rowId, { type: e.target.value })
                                }
                                className="bg-surface border border-line-subtle rounded-lg px-2 py-1 text-xs text-ink-secondary focus:outline-none"
                              >
                                {TYPE_OPTIONS.map((t) => (
                                  <option key={t.key} value={t.key}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  list="existing-categories-list"
                                  value={row.type === "transfer" ? "Transfer" : row.category}
                                  disabled={row.type === "transfer"}
                                  onChange={(e) =>
                                    updateRow(row.rowId, { category: e.target.value })
                                  }
                                  className="w-36 bg-surface border border-line-subtle rounded-lg px-2.5 py-1 text-xs text-ink-secondary focus:outline-none focus:border-line-focus"
                                />
                                {row.aiEnhanced && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tint-active text-ink-primary font-medium shrink-0">
                                    AI
                                  </span>
                                )}
                                {isNewCat && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-10 text-green-100 shrink-0">
                                    New
                                  </span>
                                )}
                              </div>
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums ${
                                row.type === "income"
                                  ? "text-green-100"
                                  : row.type === "transfer"
                                  ? "text-ink-muted"
                                  : "text-red-100"
                              }`}
                            >
                              {row.type === "income" ? "+" : row.type === "transfer" ? "" : "-"}
                              {cFormat(row.amount, { currency })}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-ink-muted whitespace-nowrap tabular-nums">
                              {row.closing_balance !== null && row.closing_balance !== undefined
                                ? cFormat(row.closing_balance, { currency })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <datalist id="existing-categories-list">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} />
                  ))}
                </datalist>
              </div>
            )}
          </div>
        ) : (
          /* Google Pay Activity Mode */
          <div className="flex flex-col gap-4">
            <div className="text-sm text-ink-subtle">
              Status: <span className="text-ink-secondary font-medium">{gpayStatus}</span>
            </div>

            {gpayError && (
              <div className="p-3.5 bg-red-10 text-red-100 text-sm rounded-xl whitespace-pre-wrap">
                {gpayError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={fetchGpayData}
                disabled={gpayBusy || !user}
                className="px-5 py-2.5 bg-surface-elevated hover:bg-surface-hover border border-line text-ink-secondary rounded-full text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                1. Load Data
              </button>
              <button
                type="button"
                onClick={startGpayImport}
                disabled={gpayBusy || gpayTransactions.length === 0 || !user}
                className="px-5 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                2. Start Import
              </button>
            </div>

            {gpayTransactions.length > 0 && (
              <div className="border border-line-subtle rounded-2xl overflow-hidden bg-surface-elevated/40">
                <div className="bg-surface-elevated px-4 py-3 text-sm font-normal text-ink-body border-b border-line-subtle">
                  Preview ({gpayTransactions.length} items)
                </div>
                <div className="max-h-[480px] overflow-auto scrollbar-minimal">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-ink-subtle bg-surface border-b border-line-subtle sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-normal">Date</th>
                        <th className="px-4 py-3 font-normal">Details</th>
                        <th className="px-4 py-3 font-normal">Amount</th>
                        <th className="px-4 py-3 font-normal">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gpayTransactions.map((tx, i) => (
                        <tr
                          key={tx.external_id || i}
                          className="border-b border-line-faint last:border-b-0 hover:bg-tint-subtle"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                            {tx.date}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-normal text-ink-secondary">{tx.note}</div>
                            <div className="text-xs text-ink-subtle mt-0.5">
                              Wallet: {tx.wallet} • Payee: {tx.payee}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-3 font-medium whitespace-nowrap ${
                              tx.type === "income" ? "text-green-100" : "text-red-100"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {cFormat(tx.amount, { currency })}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-subtle">
                            {tx.external_id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
