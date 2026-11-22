"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { usePlanningOverview } from "@/app/hooks/useFinanceData";
import LoadingAnim from "@/app/components/LoadingAnim";
import DebtsSection from "../planning/components/DebtsSection";

export default function DebtsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "INR";
  const { data: planning, isLoading } = usePlanningOverview();

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex justify-center items-center">
        <LoadingAnim />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <DebtsSection planning={planning} currency={currency} />
    </div>
  );
}
