"use client";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { useAuth } from "../contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingAnim from "../components/LoadingAnim";

export default function DashboardLayout({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (!user || isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-app-bg">
        <LoadingAnim />
      </div>
    );
  }

  return (
    <main className="flex w-full min-h-screen lg:h-screen lg:overflow-hidden bg-app-bg p-2 sm:p-4 lg:p-6 gap-4 lg:gap-6">
      <Sidebar
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="grow flex flex-col min-w-0 bg-surface border border-white/[0.05] rounded-3xl p-5 sm:p-8 lg:p-10 lg:overflow-y-auto scrollbar-minimal">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <div key={pathname} className="grow flex flex-col animate-fade-up">
          {children}
        </div>
      </div>
    </main>
  );
}
