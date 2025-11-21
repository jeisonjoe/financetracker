"use client";

import Link from "next/link";
import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "../supabase/supabase-client";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const handleData = (key, value) => {
    setData((prev) => {
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { email, password } = data;
      if (!email || !password) {
        throw new Error("Please enter a valid email and password");
      }
      const { data: loginData, error } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );
      if (error) throw error;
      if (loginData.session) {
        toast.success(`Logged in as ${loginData.user.user_metadata.email}`);
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error(error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-18 items-start h-full justify-center">
      <h2 className="text-accent text-4xl font-semibold px-1">
        Login to your account!
      </h2>
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="lastName" className="px-2 text-sm text-zinc-400 ">
              Email
            </label>
            <input
              className=" border-1 bg-white border-zinc-100 text-zinc-800 rounded-lg p-4 py-3.5 text-base focus:outline-none"
              type="text"
              name="email"
              id="email"
              placeholder="johndoe@gmail.com"
              onInput={(e) => handleData("email", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="lastName" className="px-2 text-sm text-zinc-400 ">
              Password
            </label>
            <input
              className=" border-1 bg-white border-zinc-100 text-zinc-800 rounded-lg p-4 py-3.5 text-base focus:outline-none"
              type="password"
              name="password"
              id="password"
              placeholder="password"
              onInput={(e) => handleData("password", e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Link
              href={"/forgot-password"}
              className="text-accent underline justify-self-end"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <button
          className="w-full p-3.5  bg-accent text-white text-lg rounded-lg cursor-pointer"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          Login
        </button>
        <div className="text-zinc-500 text-lg flex items-center gap-2">
          Don't have an account?{" "}
          <Link href={"/signup"} className="underline text-accent">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
