"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

export default function LoginForm() {
  const [data, setData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleData = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { email, password } = data;
      if (!email || !password) {
        throw new Error("Please enter a valid email and password");
      }
      const user = await login(email, password);
      toast.success(`Logged in as ${user.email}`);
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Unable to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-9 items-start w-full">
      <div>
        <h2 className="text-zinc-100 text-3xl sm:text-4xl font-light">
          Welcome back
        </h2>
        <p className="text-sm text-zinc-500 mt-1.5">
          Sign in to continue to your dashboard.
        </p>
      </div>

      <div className="w-full flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="email" className="px-1 text-xs text-zinc-400 font-medium">
              Email
            </label>
            <input
              className="bg-surface-elevated border border-white/[0.06] text-zinc-100 placeholder:text-zinc-600 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors"
              type="email"
              name="email"
              id="email"
              placeholder="johndoe@gmail.com"
              value={data.email}
              onChange={(e) => handleData("email", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="password" className="px-1 text-xs text-zinc-400 font-medium">
              Password
            </label>
            <input
              className="bg-surface-elevated border border-white/[0.06] text-zinc-100 placeholder:text-zinc-600 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors"
              type="password"
              name="password"
              id="password"
              placeholder="Enter your password"
              value={data.password}
              onChange={(e) => handleData("password", e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-zinc-100 text-zinc-950 text-sm font-medium rounded-full cursor-pointer hover:bg-white transition-colors disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Login"}
        </button>

        <div className="text-zinc-500 text-sm flex items-center gap-2">
          <span>Don&apos;t have an account?</span>
          <Link href="/signup" className="text-zinc-200 hover:underline font-medium">
            Create an account
          </Link>
        </div>
      </div>
    </form>
  );
}
