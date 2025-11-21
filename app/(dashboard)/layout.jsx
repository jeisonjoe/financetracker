"use client";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import AuthContextProvider, { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingAnim from "../components/LoadingAnim";
import ActionModal from "../components/ActionModal";

export default function layout({ children }) {
  return (
    <AuthContextProvider>
      <UserCheck children={children} />
    </AuthContextProvider>
  );
}

function UserCheck({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading]);

  if (!user || isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <LoadingAnim />
      </div>
    );
  }

  return (
    <main className="flex w-full h-screen overflow-hidden bg-app-bg">
      <ActionModal />
      <Sidebar />
      <div className="grow p-8">
        <Header />
        {children}
      </div>
    </main>
  );
}
