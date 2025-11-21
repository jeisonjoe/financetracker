import IconPicker from "@/app/components/IconPicker";
import BudgetWidget from "../components/BudgetWidget";
import StatCards from "../components/StatCards";
import TransactionsWidget from "../components/TransactionsWidget";
import WalletWidget from "../components/WalletWidget";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <StatCards />
      <div className="flex gap-4 w-full h-[68vh]">
        <WalletWidget />
        <BudgetWidget />
        <TransactionsWidget />
      </div>
    </div>
  );
}
