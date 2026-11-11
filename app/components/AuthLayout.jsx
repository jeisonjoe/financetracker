"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

export default function AuthLayout({ children, redirectIfAuthenticated = true }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (redirectIfAuthenticated && !isLoading && user) {
      router.replace("/dashboard");
    }
  }, [redirectIfAuthenticated, isLoading, user, router]);

  return (
    <main className="min-h-screen w-full bg-app-bg p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
      <div className="w-full lg:w-1/2 flex items-center justify-start px-6 py-10 lg:p-16 lg:pb-24">
        <div className="max-w-xl">
          <div className="flex items-center gap-2.5 text-sm text-ink-muted font-normal">
            <span className="w-2 h-2 rounded-full bg-ink-muted" />
            <span>Expense Tracker</span>
          </div>

          <div className="flex flex-col gap-2 mt-12 lg:mt-20">
            <span className="text-4xl sm:text-5xl lg:text-6xl text-ink-subtle font-light leading-tight">
              Get started with
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-ink-primary leading-tight">
              FinTrack.
            </h2>
          </div>

          <p className="text-base sm:text-lg text-ink-subtle mt-8 lg:mt-10 leading-relaxed font-light">
            Your money, organized and optimized for smarter spending and quiet clarity.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-surface border border-line-subtle rounded-3xl p-8 sm:p-12 lg:p-16 flex items-center">
        <div className="w-full">{children}</div>
      </div>
    </main>
  );
}
