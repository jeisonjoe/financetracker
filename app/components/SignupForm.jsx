"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { validateEmail } from "../utils/util";
import { supabase } from "../supabase/supabase-client";
import { toast, Toaster } from "sonner";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleData = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const { firstName, lastName, email, password } = data;
    if (!firstName || !lastName || !password) {
      toast.error("Please fill in with the required details");
      return;
    }
    if (email) {
      if (!validateEmail(email)) {
        console.error("Enter a valid email");
        return;
      }
    }

    setIsLoading(true);

    const { data: userData, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }
    if (userData.session) {
      toast.success("Account created successfully!");
      router.push("/dashboard");
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col gap-18 items-start h-full justify-center">
      <h2 className="text-accent text-4xl font-semibold px-1">
        Create your account!
      </h2>
      <div className="w-full flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2 w-lg">
            <label htmlFor="firstName" className="px-2 text-sm text-zinc-400 ">
              First Name
            </label>
            <input
              className=" border-1 bg-white border-zinc-100 text-zinc-800 rounded-lg p-4 py-3.5 text-base focus:outline-none"
              type="text"
              name="firstName"
              id="firstName"
              placeholder="John"
              value={data?.firstName || ""}
              autoComplete="off"
              autoCorrect="off"
              onInput={(e) => handleData("firstName", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 w-lg">
            <label htmlFor="lastName" className="px-2 text-sm text-zinc-400 ">
              Last Name
            </label>
            <input
              className=" border-1 bg-white border-zinc-100 text-zinc-800 rounded-lg p-4 py-3.5 text-base focus:outline-none"
              type="text"
              name="lastName"
              id="lastName"
              placeholder="Doe"
              autoComplete="off"
              value={data.lastName || ""}
              onInput={(e) => handleData("lastName", e.target.value)}
            />
          </div>
        </div>
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
            autoComplete="off"
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
        <button
          className="w-full p-3.5  bg-accent text-white text-lg rounded-lg cursor-pointer"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          Create
        </button>
        <div className="text-zinc-500 text-lg flex items-center gap-2">
          Already have an account?{" "}
          <Link href={"/"} className="underline text-accent">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
