"use client";

import { cFormat } from "@/app/utils/currencyFormat";
import { useAnalytics } from "@/app/hooks/useFinanceData";
import { useAuth } from "@/app/contexts/AuthContext";

export default function WalletWidget() {
  const { data, isLoading } = useAnalytics();
  const { user } = useAuth();
  const currency = user?.currency || "INR";

  const wallets = data?.wallets || [];

  return (
    <div className="flex flex-col gap-3 bg-surface-elevated/50 rounded-2xl border border-line-subtle p-5 h-full min-h-[380px]">
      <div className="flex justify-between items-center gap-2">
        <span className="text-lg text-ink-secondary font-normal">My Wallets</span>
      </div>

      <div className="overflow-y-auto scrollbar-minimal grow pr-1">
        {isLoading ? (
          <div className="flex flex-col gap-4 mt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse py-3">
                <div className="h-4 w-1/3 bg-surface-elevated rounded mb-2" />
                <div className="h-7 w-full bg-surface-elevated rounded" />
              </div>
            ))}
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center text-ink-subtle text-sm py-12">
            No wallet data found
          </div>
        ) : (
          wallets.map((item) => (
            <div
              key={item.id || item.name}
              className="flex flex-col gap-3 border-b border-line-faint py-4 last-of-type:border-b-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-secondary text-base font-normal">
                  {item.name}
                </span>
                <span className="text-xs text-ink-subtle bg-tint px-2.5 py-0.5 rounded-full capitalize">
                  {item.type}
                </span>
              </div>

              <div className="flex justify-between items-end gap-4">
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-xs text-ink-subtle">Balance</span>
                  <span className="text-xl font-light text-ink-primary tabular-nums">
                    {cFormat(item.balance, { currency })}
                  </span>
                </div>

                <div className="flex gap-5 tabular-nums">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-ink-subtle">Spent</span>
                    <span className="text-sm font-medium text-red-100">
                      -{cFormat(item.spent, { currency })}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-xs text-ink-subtle">Earned</span>
                    <span className="text-sm font-medium text-green-100">
                      +{cFormat(item.earned, { currency })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
