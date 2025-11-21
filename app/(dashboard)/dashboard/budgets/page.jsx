import BudgetWidget from "../../components/BudgetWidget";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 w-full h-[68vh]">
        <BudgetWidget />
      </div>
    </div>
  );
}
