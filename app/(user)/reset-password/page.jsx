"use client";

import { supabase } from "@/app/supabase/supabase-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function Page() {
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
      const { password } = data;
      if (!password) {
        throw new Error("Please enter new password");
      }
      const { data: response, error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) {
        throw error;
      } else {
        toast.success("Password updated successfully. Please login");
        router.push("/");
      }
    } catch (error) {
      toast.error(error.message);
    }
    setIsLoading(false);
  };

  return (
    <main className="p-6 flex w-full h-screen">
      <div className="w-1/2 h-full flex items-center justify-start p-16 pb-32">
        <div className="">
          <h1 className="text-lg text-accent font-medium">FinTrack</h1>
          <div className="flex flex-col gap-5 mt-24">
            <span className="text-6xl text-accent-mild">Get started with</span>
            <h2 className="text-6xl font-bold text-accent">FinTrack.</h2>
          </div>
          <div className="text-xl text-sec-96 mt-12 max-w-xl leading-[1.35]">
            ”Your money, organized and optimized for smarter spending and
            stronger financial growth.”
          </div>
        </div>
      </div>
      <div className="w-1/2 h-full bg-app-bg rounded-2xl p-16 px-20">
        <div className="flex flex-col gap-12 items-start h-full justify-center">
          <h2 className="text-accent text-4xl font-semibold px-1">
            Create new Password
          </h2>
          <div className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="lastName" className="px-2 text-sm text-zinc-400 ">
                Enter new password
              </label>
              <input
                className=" border-1 bg-white border-zinc-100 text-zinc-800 rounded-lg p-4 py-3.5 text-base focus:outline-none"
                type="password"
                name="email"
                id="email"
                placeholder=""
                value={data.password || ""}
                onInput={(e) => handleData("password", e.target.value)}
              />
            </div>

            <button
              className="w-full p-3.5  bg-accent text-white text-lg rounded-lg cursor-pointer"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              Update password
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
