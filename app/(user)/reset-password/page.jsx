"use client";

import AuthLayout from "@/app/components/AuthLayout";
import { AuthApi } from "@/app/services/ApiClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      await AuthApi.resetPassword({ password, token });
      toast.success("Password updated successfully. Please login.");
      router.push("/");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-9 items-start w-full">
      <h2 className="text-ink-primary text-3xl sm:text-4xl font-light">
        Create new password
      </h2>

      <div className="w-full flex flex-col gap-5">
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="newPassword" className="px-1 text-xs text-ink-muted font-medium">
            New password
          </label>
          <input
            className="bg-surface-elevated border border-line-subtle text-ink-primary placeholder:text-ink-placeholder rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-line-focus transition-colors"
            type="password"
            name="newPassword"
            id="newPassword"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-cta text-cta-ink text-sm font-medium rounded-full cursor-pointer hover:bg-cta-hover transition-colors disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </form>
  );
}

export default function Page() {
  return (
    <AuthLayout redirectIfAuthenticated={false}>
      <Suspense fallback={<div className="text-sm text-ink-subtle">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
