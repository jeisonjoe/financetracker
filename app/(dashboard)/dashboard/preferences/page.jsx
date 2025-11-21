import TransactionsWidget from "../../components/TransactionsWidget";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 w-full h-[68vh]">
        <TransactionsWidget />
      </div>
    </div>
  );
}
