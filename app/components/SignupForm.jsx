"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { validateEmail } from "../utils/util";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

export default function SignupForm() {
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Create Account | FinTrack";
    }
  }, []);

  const handleData = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password } = data;
    if (!firstName.trim() || !lastName.trim() || !password) {
      toast.error("Please fill in all required details");
      return;
    }
    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      await signup({ firstName, lastName, email, password });
      toast.success("Account created successfully");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-9 items-start w-full">
      <div>
        <h2 className="text-ink-primary text-3xl sm:text-4xl font-light">
          Create your account
        </h2>
        <p className="text-sm text-ink-subtle mt-1.5">
          Start tracking your wallets and monthly pace.
        </p>
      </div>

      <div className="w-full flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="firstName" className="px-1 text-xs text-ink-muted font-medium">
              First Name
            </label>
            <input
              className="bg-surface-elevated border border-line-subtle text-ink-primary placeholder:text-ink-placeholder rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-line-focus transition-colors"
              type="text"
              name="firstName"
              id="firstName"
              placeholder="Jeison"
              value={data.firstName}
              onChange={(e) => handleData("firstName", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lastName" className="px-1 text-xs text-ink-muted font-medium">
              Last Name
            </label>
            <input
              className="bg-surface-elevated border border-line-subtle text-ink-primary placeholder:text-ink-placeholder rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-line-focus transition-colors"
              type="text"
              name="lastName"
              id="lastName"
              placeholder="Joe"
              value={data.lastName}
              onChange={(e) => handleData("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="email" className="px-1 text-xs text-ink-muted font-medium">
            Email
          </label>
          <input
            className="bg-surface-elevated border border-line-subtle text-ink-primary placeholder:text-ink-placeholder rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-line-focus transition-colors"
            type="email"
            name="email"
            id="email"
            placeholder="johndoe@gmail.com"
            value={data.email}
            onChange={(e) => handleData("email", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="password" className="px-1 text-xs text-ink-muted font-medium">
            Password
          </label>
          <input
            className="bg-surface-elevated border border-line-subtle text-ink-primary placeholder:text-ink-placeholder rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-line-focus transition-colors"
            type="password"
            name="password"
            id="password"
            placeholder="Minimum 6 characters"
            value={data.password}
            onChange={(e) => handleData("password", e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-cta text-cta-ink text-sm font-medium rounded-full cursor-pointer hover:bg-cta-hover transition-colors disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        <div className="text-ink-subtle text-sm flex items-center gap-2">
          <span>Already have an account?</span>
          <Link href="/" className="text-ink-secondary hover:underline font-medium">
            Login
          </Link>
        </div>
      </div>
    </form>
  );
}
