import { Suspense } from "react";
import TransactionsWidget from "../../components/TransactionsWidget";

export const metadata = {
  title: "Transactions",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)] min-h-[480px]">
      <Suspense fallback={null}>
        <TransactionsWidget showSearch={true} showFilters={true} />
      </Suspense>
    </div>
  );
}
