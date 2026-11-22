"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BiBot, BiCheckCircle, BiHide, BiShow } from "react-icons/bi";
import { toast } from "sonner";
import { useAuth } from "@/app/contexts/AuthContext";
import Dropdown from "@/app/components/Dropdown";
import { AiApi } from "@/app/services/ApiClient";
import {
  CLAUDE_MODELS,
  DEFAULT_AI_SETTINGS,
  GEMINI_MODELS,
  getActiveAiRequestConfig,
  loadAiSettings,
  saveAiSettings,
} from "@/app/utils/aiSettings";

const CURRENCY_OPTIONS = [
  { key: "INR", name: "INR (₹)" },
  { key: "USD", name: "USD ($)" },
  { key: "EUR", name: "EUR (€)" },
  { key: "GBP", name: "GBP (£)" },
];

export default function Page() {
  const { user, provider, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [saving, setSaving] = useState(false);

  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [envConfigured, setEnvConfigured] = useState({ gemini: false, claude: false });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setCurrency(user.currency || "INR");
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
    setAiSettings(loadAiSettings());
    AiApi.getStatus()
      .then((res) => {
        if (res?.envConfigured) setEnvConfigured(res.envConfigured);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ firstName, lastName, currency });
      toast.success("Preferences updated");
    } catch (err) {
      toast.error(err.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAi = (e) => {
    e.preventDefault();
    const saved = saveAiSettings(aiSettings);
    setAiSettings(saved);
    toast.success("AI settings saved to this browser");
  };

  const handleTestAi = async () => {
    saveAiSettings(aiSettings);
    const active = getActiveAiRequestConfig(aiSettings);
    setTestingAi(true);
    try {
      const res = await AiApi.testConnection(active);
      toast.success(
        `Connected to ${res.provider === "claude" ? "Claude" : "Gemini"} (${res.model})`
      );
    } catch (err) {
      toast.error(err.message || "AI connection test failed");
    } finally {
      setTestingAi(false);
    }
  };

  const activeProvider = aiSettings.provider === "claude" ? "claude" : "gemini";
  const providerMeta =
    activeProvider === "claude"
      ? {
          keyLabel: "Claude API Key",
          modelLabel: "Claude Model",
          keyField: "claudeKey",
          modelField: "claudeModel",
          placeholder: "sk-ant-...",
          models: CLAUDE_MODELS,
          hasEnvFallback: envConfigured.claude,
        }
      : {
          keyLabel: "Gemini API Key",
          modelLabel: "Gemini Model",
          keyField: "geminiKey",
          modelField: "geminiModel",
          placeholder: "AIza...",
          models: GEMINI_MODELS,
          hasEnvFallback: envConfigured.gemini,
        };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-8">
      <div className="lg:col-span-7 flex flex-col gap-5">
        <form
          onSubmit={handleSave}
          className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-6 flex flex-col gap-5"
        >
          <div>
            <h2 className="text-lg font-normal text-ink-secondary">
              Profile &amp; Display Preferences
            </h2>
            <p className="text-xs text-ink-subtle mt-0.5">
              Manage your account details and preferred currency display.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-surface border border-line-subtle rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-surface border border-line-subtle rounded-xl px-4 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-line-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-surface border border-line-faint rounded-xl px-4 py-2.5 text-sm text-ink-subtle cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">Currency</label>
              <Dropdown
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={(opt) => setCurrency(opt.key)}
                triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-line-subtle hover:bg-surface-hover rounded-xl px-4 py-2.5 text-sm text-ink-primary cursor-pointer transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>

        {/* AI Provider & API Keys (BYOK) */}
        <form
          onSubmit={handleSaveAi}
          className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-6 flex flex-col gap-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BiBot size={19} className="text-ink-secondary" />
                <h2 className="text-lg font-normal text-ink-secondary">
                  AI Provider &amp; API Keys
                </h2>
              </div>
              <p className="text-xs text-ink-subtle mt-1">
                Used to parse bank statements and generate spending analysis. Keys are kept in your browser or loaded from server{" "}
                <code className="px-1 py-0.5 bg-surface rounded text-[11px]">.env.local</code>.
              </p>
            </div>
          </div>

          {/* Active Provider Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-subtle">Active AI Provider</label>
            <div className="flex bg-surface border border-line-subtle p-1 rounded-full self-start">
              {[
                { key: "gemini", label: "Google Gemini" },
                { key: "claude", label: "Anthropic Claude" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    setAiSettings((prev) => ({ ...prev, provider: opt.key }))
                  }
                  className={`px-4 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                    activeProvider === opt.key
                      ? "bg-cta text-cta-ink font-medium"
                      : "text-ink-subtle hover:text-ink-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Provider Key & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-ink-subtle">
                  {providerMeta.keyLabel}
                </label>
                {providerMeta.hasEnvFallback && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-green-100">
                    <BiCheckCircle size={12} />
                    .env.local fallback
                  </span>
                )}
              </div>
              <div className="flex items-center bg-surface border border-line-subtle rounded-xl px-3.5 py-2.5 gap-2 focus-within:border-line-focus">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder={
                    providerMeta.hasEnvFallback
                      ? "Using .env.local (or paste override)"
                      : providerMeta.placeholder
                  }
                  value={aiSettings[providerMeta.keyField] || ""}
                  onChange={(e) =>
                    setAiSettings((prev) => ({
                      ...prev,
                      [providerMeta.keyField]: e.target.value,
                    }))
                  }
                  className="bg-transparent text-sm text-ink-primary placeholder:text-ink-placeholder focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="text-ink-subtle hover:text-ink-primary cursor-pointer"
                  aria-label={`Toggle ${providerMeta.keyLabel} visibility`}
                >
                  {showApiKey ? <BiHide size={16} /> : <BiShow size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-ink-subtle">
                {providerMeta.modelLabel}
              </label>
              <Dropdown
                options={providerMeta.models}
                value={aiSettings[providerMeta.modelField]}
                onChange={(opt) =>
                  setAiSettings((prev) => ({
                    ...prev,
                    [providerMeta.modelField]: opt.key,
                  }))
                }
                triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-line-subtle hover:bg-surface-hover rounded-xl px-4 py-2.5 text-sm text-ink-primary cursor-pointer transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium cursor-pointer transition-colors"
            >
              Save AI Settings
            </button>
            <button
              type="button"
              onClick={handleTestAi}
              disabled={testingAi}
              className="px-5 py-2.5 bg-surface hover:bg-surface-hover border border-line-subtle text-ink-secondary rounded-full text-sm cursor-pointer transition-colors disabled:opacity-60"
            >
              {testingAi ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-6 flex flex-col gap-2">
          <h3 className="text-base font-normal text-ink-secondary">
            Active Storage Provider
          </h3>
          <p className="text-sm text-ink-muted leading-relaxed">
            Currently connected via{" "}
            <span className="font-medium text-ink-primary">
              {provider === "mysql" ? "MySQL" : "Supabase"}
            </span>
            . You can switch between MySQL and Supabase anytime using{" "}
            <code className="px-1.5 py-0.5 bg-surface rounded text-xs text-ink-secondary">
              DB_PROVIDER
            </code>{" "}
            in your environment file.
          </p>
        </div>

        <div className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-6 flex flex-col gap-3">
          <h3 className="text-base font-normal text-ink-secondary">
            Bank Statements &amp; Google Pay Import
          </h3>
          <p className="text-sm text-ink-muted leading-relaxed">
            Upload PDF, CSV, or Excel bank statements for AI parsing and automatic categorization, or import Google Pay history.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/import"
              className="px-4 py-2 bg-surface hover:bg-surface-hover border border-line-subtle text-ink-secondary rounded-full text-sm transition-colors"
            >
              Open Data Importer
            </Link>
            <Link
              href="/dashboard/insights"
              className="px-4 py-2 bg-surface hover:bg-surface-hover border border-line-subtle text-ink-secondary rounded-full text-sm transition-colors"
            >
              Open AI Insights
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
