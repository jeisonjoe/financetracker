"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BiBot,
  BiBulb,
  BiCalendar,
  BiCheckCircle,
  BiCoffee,
  BiErrorCircle,
  BiRefresh,
  BiShield,
  BiStore,
  BiTrendingUp,
  BiUserCheck,
} from "react-icons/bi";
import { toast } from "sonner";
import ProgressRing from "@/app/components/ProgressRing";
import TopMerchantsBarChart from "@/app/components/charts/TopMerchantsBarChart";
import DayOfWeekSpendChart from "@/app/components/charts/DayOfWeekSpendChart";
import SpendingCalendarHeatmap from "@/app/components/charts/SpendingCalendarHeatmap";
import TagSpendChart from "@/app/components/charts/TagSpendChart";
import { useAuth } from "@/app/contexts/AuthContext";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useGlobalPeriod } from "@/app/store/PeriodStore";
import { AiApi } from "@/app/services/ApiClient";
import {
  DEFAULT_AI_SETTINGS,
  getActiveAiRequestConfig,
  loadAiSettings,
} from "@/app/utils/aiSettings";
import { cFormat } from "@/app/utils/currencyFormat";

const INSIGHTS_CACHE_PREFIX = "fintrack_ai_insights_v1";

function cacheKey(userId, period) {
  return `${INSIGHTS_CACHE_PREFIX}:${userId || "anon"}:${period}`;
}

export default function InsightsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const { period } = useGlobalPeriod();
  const [mounted, setMounted] = useState(false);
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [envConfigured, setEnvConfigured] = useState({ gemini: false, claude: false });
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const { data: analyticsData } = useAnalytics(period);
  const merchantIntel = analyticsData?.merchantIntelligence;
  const topMerchants = merchantIntel?.topMerchants || [];
  const microSpend = merchantIntel?.microSpendSummary;
  const splitsSummary = analyticsData?.splitsSummary;
  const salaryCycle = analyticsData?.salaryCycle;
  const pace = analyticsData?.spendingPace;

  useEffect(() => {
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
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(cacheKey(user?.id, period));
      setReport(saved ? JSON.parse(saved) : null);
      setError(null);
    } catch {
      setReport(null);
    }
  }, [user?.id, period]);

  const activeAi = getActiveAiRequestConfig(aiSettings);
  const hasKeyForActive =
    mounted &&
    Boolean(
      activeAi.apiKey ||
        (activeAi.provider === "claude" ? envConfigured.claude : envConfigured.gemini)
    );

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await AiApi.generateInsights({
        period,
        provider: activeAi.provider,
        apiKey: activeAi.apiKey,
        model: activeAi.model,
      });
      setReport(res);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(cacheKey(user?.id, period), JSON.stringify(res));
      }
      toast.success("AI financial analysis updated");
    } catch (err) {
      setError(err.message || "Failed to generate AI insights");
      toast.error(err.message || "Failed to generate AI insights");
    } finally {
      setGenerating(false);
    }
  };

  const insights = report?.insights;
  const score = insights?.healthScore ?? 0;
  const scoreColor =
    score >= 75
      ? "text-green-100"
      : score >= 50
      ? "text-accent"
      : "text-red-100";

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Top Controls Bar */}
      <section className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-tint flex items-center justify-center text-ink-secondary shrink-0">
            <BiBot size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-normal text-ink-primary">
              AI Spend Analysis &amp; Usage Trends
            </h2>
            <p className="text-xs text-ink-subtle truncate">
              Engine:{" "}
              <span className="text-ink-secondary">
                {activeAi.provider === "claude" ? "Claude" : "Gemini"} ({activeAi.model})
              </span>
              {!hasKeyForActive && (
                <>
                  {" · "}
                  <Link
                    href="/dashboard/preferences"
                    className="text-red-100 underline"
                  >
                    Add API key in Preferences
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/import"
            className="px-4 py-2 rounded-full bg-surface hover:bg-surface-hover border border-line-subtle text-xs sm:text-sm text-ink-body transition-colors"
          >
            Import Statement
          </Link>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="bg-cta hover:bg-cta-hover text-cta-ink inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs sm:text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
          >
            <BiRefresh size={16} className={generating ? "animate-spin" : ""} />
            <span>
              {generating
                ? "Analyzing..."
                : report
                ? "Refresh Analysis"
                : "Generate Analysis"}
            </span>
          </button>
        </div>
      </section>

      {/* Salary Cycle Pacing Banner */}
      {salaryCycle && (
        <section className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 animate-fade-up">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-tint flex items-center justify-center text-ink-secondary shrink-0">
              <BiCalendar size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-medium text-ink-primary">
                  Salary-Cycle Budgeting (Payday to Payday)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-green-10 text-green-100 font-medium">
                  Active Cycle
                </span>
              </div>
              <p className="text-xs text-ink-subtle mt-0.5">
                Cycle anchor: Payday on day {salaryCycle.payday} · {salaryCycle.daysRemaining} days left until next paycheck
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <div className="bg-surface px-4 py-2 rounded-xl border border-line-subtle">
              <span className="text-ink-subtle block text-[11px]">Daily Safe Allowance</span>
              <span className="text-sm sm:text-base font-medium text-ink-primary tabular-nums">
                {cFormat(pace?.dailyAllowance || 0, { currency })}/day
              </span>
            </div>
            <div className="bg-surface px-4 py-2 rounded-xl border border-line-subtle">
              <span className="text-ink-subtle block text-[11px]">Cycle Burn Rate</span>
              <span className="text-sm sm:text-base font-medium text-ink-secondary tabular-nums">
                {cFormat(pace?.spent || 0, { currency })} / {cFormat(salaryCycle.salaryAmount || pace?.spendingCap || 0, { currency })}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Habit Radar: Top Merchants & Micro-Spend Leakage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Merchants Leaderboard */}
        <div className="lg:col-span-7 bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BiStore size={18} className="text-ink-secondary" />
              <h3 className="text-base font-medium text-ink-primary">
                Top Merchants &amp; Frequency
              </h3>
            </div>
            <span className="text-xs text-ink-subtle">
              {topMerchants.length} top spend spots
            </span>
          </div>

          {topMerchants.length === 0 ? (
            <p className="text-xs sm:text-sm text-ink-subtle py-4">
              No merchant transactions recorded in this period.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="pb-2 border-b border-line-faint">
                <TopMerchantsBarChart
                  merchants={topMerchants}
                  currency={currency}
                  height={160}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                {topMerchants.map((m, idx) => (
                <div
                  key={`${m.name}-${idx}`}
                  className="bg-surface border border-line-faint rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink-muted w-5">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-medium text-ink-primary truncate">
                        {m.name}
                      </span>
                    </div>
                    <div className="text-xs text-ink-subtle mt-0.5 pl-7">
                      {m.category} · {m.transactionCount}{" "}
                      {m.transactionCount === 1 ? "visit" : "visits"}
                      {m.transactionCount > 1 ? ` (avg ${cFormat(m.avgTicketSize, { currency })})` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-ink-primary tabular-nums shrink-0">
                    {cFormat(m.totalSpent, { currency })}
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        {/* Micro-Spend Leakage Radar */}
        <div className="lg:col-span-5 bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col justify-between gap-4 animate-fade-up">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BiCoffee size={18} className="text-ink-secondary" />
                <h3 className="text-base font-medium text-ink-primary">
                  Small-Spend Leakage (≤ {cFormat(200, { currency })})
                </h3>
              </div>
              {microSpend && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-tint text-ink-secondary font-medium tabular-nums">
                  {microSpend.percentOfExpenses}% of spend
                </span>
              )}
            </div>

            <p className="text-xs text-ink-subtle leading-relaxed">
              Frequent micro-spends like daily breakfast, chai, and metro taps silently add up across your monthly statement.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="bg-surface p-3 rounded-xl border border-line-subtle">
                <div className="text-xs text-ink-subtle">Micro Payments</div>
                <div className="text-base font-medium text-ink-primary mt-1 tabular-nums">
                  {microSpend?.count || 0} taps
                </div>
              </div>
              <div className="bg-surface p-3 rounded-xl border border-line-subtle">
                <div className="text-xs text-ink-subtle">Total Leakage</div>
                <div className="text-base font-medium text-ink-primary mt-1 tabular-nums">
                  {cFormat(microSpend?.totalAmount || 0, { currency })}
                </div>
              </div>
            </div>

            {microSpend?.topMicroSpots?.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-line-faint">
                <span className="text-xs text-ink-subtle font-normal">
                  Top Frequent Micro-Spend Spots:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {microSpend.topMicroSpots.map((spot, i) => (
                    <span
                      key={`${spot.name}-${i}`}
                      className="px-2.5 py-1 rounded-full text-xs bg-surface border border-line-subtle text-ink-secondary"
                    >
                      {spot.name}: {cFormat(spot.total, { currency })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-ink-subtle bg-surface p-3 rounded-xl border border-line-faint">
            Tip: Daily small UPI taps under ₹200 account for {microSpend?.count || 0} debits. Tagging these as Food or Travel prevents unbudgeted cashflow leakage.
          </div>
        </div>
      </div>

      {/* Friend Splits & Lending Tracker */}
      {splitsSummary?.byPerson?.length > 0 && (
        <section className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BiUserCheck size={19} className="text-ink-secondary" />
              <h3 className="text-base font-medium text-ink-primary">
                Friend Splits &amp; Lending Tracker (&quot;Who Owes Me&quot;)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs tabular-nums">
              <span className="text-ink-muted">
                Total Lent:{" "}
                <span className="font-medium text-ink-primary">
                  {cFormat(splitsSummary.totalLent, { currency })}
                </span>
              </span>
              <span className="text-ink-muted">
                Settled:{" "}
                <span className="font-medium text-green-100">
                  {cFormat(splitsSummary.totalSettled, { currency })}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {splitsSummary.byPerson.map((friend) => (
              <div
                key={friend.person}
                className="bg-surface border border-line-subtle rounded-xl p-4 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-ink-primary truncate block">
                      {friend.person}
                    </span>
                    <span className="text-xs text-ink-subtle">
                      {friend.transactionCount}{" "}
                      {friend.transactionCount === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      friend.status === "owes_you"
                        ? "bg-tint-active text-ink-primary"
                        : friend.status === "settled"
                        ? "bg-green-10 text-green-100"
                        : "bg-red-10 text-red-100"
                    }`}
                  >
                    {friend.status === "owes_you"
                      ? "Owes you"
                      : friend.status === "settled"
                      ? "Settled"
                      : "You owe"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line-faint text-xs">
                  <span className="text-ink-subtle">Balance</span>
                  <span className="text-sm font-medium text-ink-primary tabular-nums">
                    {cFormat(Math.abs(friend.balance), { currency })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Behavioral Spend Patterns: Day of Week & Tag Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-up">
        {/* Day-of-Week Profile */}
        <div className="lg:col-span-7 bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BiCalendar size={18} className="text-ink-secondary" />
              <h3 className="text-base font-medium text-ink-primary">
                Day-of-Week Spending Profile
              </h3>
            </div>
            <span className="text-xs text-ink-subtle">Mon – Sun Activity</span>
          </div>
          <DayOfWeekSpendChart
            dayOfWeekProfile={analyticsData?.dayOfWeekProfile}
            currency={currency}
            height={190}
          />
        </div>

        {/* Tag & Project Spend Breakdown */}
        <div className="lg:col-span-5 bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-ink-primary">
              Tag &amp; Project Spend
            </h3>
            <span className="text-xs text-ink-subtle">
              {analyticsData?.tagBreakdown?.length || 0} active tags
            </span>
          </div>
          <TagSpendChart
            tagBreakdown={analyticsData?.tagBreakdown || []}
            currency={currency}
            height={190}
          />
        </div>
      </section>

      {/* Spending Calendar Matrix Heatmap */}
      <section className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 flex flex-col gap-4 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BiCalendar size={18} className="text-ink-secondary" />
            <h3 className="text-base font-medium text-ink-primary">
              Monthly Spending Intensity Calendar
            </h3>
          </div>
          <span className="text-xs text-ink-subtle">Daily spend distribution</span>
        </div>
        <SpendingCalendarHeatmap
          calendarHeatmap={analyticsData?.calendarHeatmap || []}
          dailyAllowance={pace?.dailyAllowance || 0}
          currency={currency}
        />
      </section>

      {error && (
        <div className="p-4 rounded-2xl bg-red-10 text-red-100 text-sm">
          {error}
        </div>
      )}

      {!insights ? (
        <div className="bg-surface-elevated/40 border border-line-subtle rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-tint flex items-center justify-center text-ink-secondary">
            <BiTrendingUp size={26} />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-normal text-ink-primary">
              Generate your on-demand financial report
            </h3>
            <p className="text-xs sm:text-sm text-ink-subtle mt-1.5 leading-relaxed">
              Analyze your category mix, spending pace, recurring leaks, and monthly cashflow trends using your own Gemini or Claude API key.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mt-1">
            {!hasKeyForActive && (
              <Link
                href="/dashboard/preferences"
                className="px-5 py-2.5 rounded-full bg-surface hover:bg-surface-hover border border-line text-sm text-ink-secondary transition-colors"
              >
                Add API Key in Preferences
              </Link>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2.5 rounded-full bg-cta hover:bg-cta-hover text-cta-ink text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
            >
              {generating ? "Generating..." : "Analyze My Finances"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 animate-fade-up">
          {/* Health Score & Executive Summary */}
          <div className="bg-surface-elevated/50 border border-line-subtle rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5 min-w-0 flex-1">
              <ProgressRing
                percent={score}
                size={80}
                strokeWidth={6}
                colorClass={scoreColor}
                label={`${score}`}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base sm:text-lg font-normal text-ink-primary">
                    Financial Health: {insights.healthLabel}
                  </span>
                </div>
                <p className="text-sm text-ink-body mt-1.5 leading-relaxed">
                  {insights.headline}
                </p>
                <div className="text-xs text-ink-subtle mt-2">
                  Generated by {report.provider === "claude" ? "Claude" : "Gemini"} ({report.model})
                  {report.generatedAt
                    ? ` · ${new Date(report.generatedAt).toLocaleString()}`
                    : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          {insights.highlights?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {insights.highlights.map((item, idx) => {
                const badgeStyle =
                  item.impact === "positive"
                    ? "bg-green-10 text-green-100"
                    : item.impact === "warning"
                    ? "bg-red-10 text-red-100"
                    : "bg-tint text-ink-secondary";
                const Icon =
                  item.impact === "positive"
                    ? BiCheckCircle
                    : item.impact === "warning"
                    ? BiErrorCircle
                    : BiBulb;

                return (
                  <div
                    key={`${item.title}-${idx}`}
                    className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-ink-primary">
                        {item.title}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${badgeStyle}`}
                      >
                        <Icon size={15} />
                      </span>
                    </div>
                    <p className="text-xs text-ink-subtle leading-relaxed">
                      {item.detail}
                    </p>
                    {item.metric && (
                      <div className="text-sm font-medium text-ink-secondary tabular-nums pt-1 border-t border-line-faint">
                        {item.metric}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Trends & Recurring Leaks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 bg-surface-elevated/45 border border-line-subtle rounded-2xl p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-normal text-ink-secondary">
                  Usage Trends
                </h3>
                <BiTrendingUp className="text-ink-subtle" size={17} />
              </div>

              {insights.usageTrends?.length === 0 ? (
                <p className="text-sm text-ink-subtle py-4">
                  Not enough multi-day data yet to highlight usage patterns.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {insights.usageTrends.map((trend, i) => (
                    <div
                      key={`${trend.title}-${i}`}
                      className="rounded-xl bg-surface border border-line-faint p-3.5 flex flex-col gap-1"
                    >
                      <span className="text-sm font-medium text-ink-primary">
                        {trend.title}
                      </span>
                      <span className="text-xs text-ink-subtle leading-relaxed">
                        {trend.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-surface-elevated/45 border border-line-subtle rounded-2xl p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-normal text-ink-secondary">
                  Recurring Charges &amp; Spend Leaks
                </h3>
                <BiShield className="text-ink-subtle" size={17} />
              </div>

              {insights.subscriptionsAndLeaks?.length === 0 ? (
                <p className="text-sm text-ink-subtle py-4">
                  No recurring subscriptions or frequent spend leaks flagged in this period.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {insights.subscriptionsAndLeaks.map((leak, i) => (
                    <div
                      key={`${leak.name}-${i}`}
                      className="rounded-xl bg-surface border border-line-faint p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-primary truncate">
                          {leak.name}
                        </div>
                        <div className="text-xs text-ink-subtle mt-0.5">
                          {leak.frequency ? `${leak.frequency} · ` : ""}
                          {leak.note}
                        </div>
                      </div>
                      {Number(leak.estimatedMonthly) > 0 && (
                        <span className="text-sm font-medium text-ink-secondary tabular-nums shrink-0">
                          {cFormat(leak.estimatedMonthly, { currency })}/mo
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div className="bg-surface-elevated/45 border border-line-subtle rounded-2xl p-5 flex flex-col gap-3.5">
              <h3 className="text-base font-normal text-ink-secondary">
                Recommended Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.recommendations.map((rec, i) => (
                  <div
                    key={`${rec.title}-${i}`}
                    className="rounded-xl bg-surface border border-line-faint p-4 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-ink-primary">
                        {rec.title}
                      </span>
                      {Number(rec.potentialMonthlySavings) > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-10 text-green-100 tabular-nums shrink-0">
                          Save ~{cFormat(rec.potentialMonthlySavings, { currency })}/mo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-subtle leading-relaxed">
                      {rec.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

