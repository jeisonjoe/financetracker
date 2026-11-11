import Link from "next/link";

const HELP_SECTIONS = [
  {
    title: "Adding & Editing Transactions",
    description:
      "Click Add Transaction to log income or expenses. Double-click any transaction row or hover to reveal edit and delete actions.",
  },
  {
    title: "Streams, Categories & Daily Pace",
    description:
      "Click the stacked Streams card on Overview to cycle through wallets. Set monthly category limits on Budgets to calculate your safe daily spending pace.",
  },
  {
    title: "Importing Google Pay Activity",
    description:
      "Place your Google Pay My Activity.html file inside app/dataImports/ and open Import Data from the sidebar to preview and deduplicate entries.",
  },
  {
    title: "Switching Between MySQL & Supabase",
    description:
      "Set DB_PROVIDER=mysql or DB_PROVIDER=supabase in .env.local and restart the server. Both database and authentication layers swap cleanly via RepositoryFactory.",
  },
];

export default function Page() {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HELP_SECTIONS.map((item) => (
          <div
            key={item.title}
            className="bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-6 flex flex-col gap-2"
          >
            <h2 className="text-base font-normal text-zinc-200">
              {item.title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated/50 rounded-2xl border border-white/[0.06] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-normal text-zinc-200">
            Ready to review your expenses?
          </h3>
          <p className="text-sm text-zinc-500">
            Return to your overview or open the data importer.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-surface hover:bg-surface-hover border border-white/[0.06] rounded-full text-sm text-zinc-200 transition-colors"
          >
            Go to Overview
          </Link>
          <Link
            href="/import"
            className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-sm font-medium transition-colors"
          >
            Import Data
          </Link>
        </div>
      </div>
    </div>
  );
}
