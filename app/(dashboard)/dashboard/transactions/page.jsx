import TransactionsWidget from "../../components/TransactionsWidget";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-140px)] min-h-[480px]">
      <TransactionsWidget showSearch={true} showFilters={true} />
    </div>
  );
}
