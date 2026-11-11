"use client";

import AuthLayout from "@/app/components/AuthLayout";
import { AuthApi } from "@/app/services/ApiClient";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function Page() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setDevResetUrl("");
    try {
      if (!email.trim()) {
        throw new Error("Please enter a valid email");
      }
      const res = await AuthApi.forgotPassword(email);
      toast.success("Password reset instructions prepared");
      if (res.resetUrl) {
        setDevResetUrl(res.resetUrl);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="flex flex-col gap-9 items-start w-full">
        <div>
          <h2 className="text-zinc-100 text-3xl sm:text-4xl font-light">
            Reset your password
          </h2>
          <p className="text-sm text-zinc-500 mt-1.5">
            Enter your registered email to receive a reset link.
          </p>
        </div>

        <div className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="email" className="px-1 text-xs text-zinc-400 font-medium">
              Registered email
            </label>
            <input
              className="bg-surface-elevated border border-white/[0.06] text-zinc-100 placeholder:text-zinc-600 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors"
              type="email"
              name="email"
              id="email"
              placeholder="johndoe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-zinc-100 text-zinc-950 text-sm font-medium rounded-full cursor-pointer hover:bg-white transition-colors disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>

          {devResetUrl && (
            <div className="p-4 rounded-xl bg-surface-elevated border border-white/[0.06] text-sm text-zinc-400">
              <p className="mb-1.5 font-medium text-zinc-200">Direct reset link:</p>
              <Link href={devResetUrl} className="text-zinc-100 underline break-all">
                {devResetUrl}
              </Link>
            </div>
          )}

          <div className="text-zinc-500 text-sm">
            <Link href="/" className="text-zinc-200 hover:underline font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
