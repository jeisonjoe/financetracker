"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/app/contexts/AuthContext";
import Dropdown from "@/app/components/Dropdown";

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

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setCurrency(user.currency || "INR");
    }
  }, [user]);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-6">
      <form
        onSubmit={handleSave}
        className="lg:col-span-7 bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-6 flex flex-col gap-5"
      >
        <div>
          <h2 className="text-lg font-normal text-zinc-200">
            Profile & Display Preferences
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage your account details and preferred currency display.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-surface border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-surface border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-surface border border-white/[0.04] rounded-xl px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-500">Currency</label>
            <Dropdown
              options={CURRENCY_OPTIONS}
              value={currency}
              onChange={(opt) => setCurrency(opt.key)}
              triggerClass="w-full flex items-center justify-between gap-2 bg-surface border border-white/[0.06] hover:bg-surface-hover rounded-xl px-4 py-2.5 text-sm text-zinc-100 cursor-pointer transition-colors"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>

      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-6 flex flex-col gap-2">
          <h3 className="text-base font-normal text-zinc-200">
            Active Storage Provider
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Currently connected via{" "}
            <span className="font-medium text-zinc-100">
              {provider === "mysql" ? "MySQL" : "Supabase"}
            </span>
            . You can switch between MySQL and Supabase anytime using{" "}
            <code className="px-1.5 py-0.5 bg-surface rounded text-xs text-zinc-200">
              DB_PROVIDER
            </code>{" "}
            in your environment file.
          </p>
        </div>

        <div className="bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-6 flex flex-col gap-3">
          <h3 className="text-base font-normal text-zinc-200">
            Google Pay Import
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Parse and import historical transactions from your Google Pay activity export.
          </p>
          <Link
            href="/import"
            className="self-start px-4 py-2 bg-surface hover:bg-surface-hover border border-white/[0.06] text-zinc-200 rounded-full text-sm transition-colors"
          >
            Open Data Importer
          </Link>
        </div>
      </div>
    </div>
  );
}
