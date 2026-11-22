import Link from "next/link";

export const metadata = {
  title: "Help & Documentation",
};

const HELP_SECTIONS = [
  {
    title: "Adding & Editing Transactions",
    description:
      "Click Add Transaction in the header to log income, expenses, or wallet transfers. Double-click any transaction row or hover to reveal edit and delete actions.",
  },
  {
    title: "Wallets, Categories & Daily Pace",
    description:
      "Switch between wallets directly from the Overview card deck. Organize icons under Categories and set monthly limits under Budgets to calculate your safe daily spending pace.",
  },
  {
    title: "Importing Bank Statements & Google Pay",
    description:
      "Upload PDF, CSV, or Excel bank statements under Import Data using your Gemini or Claude API key, or import your Google Pay activity export with automatic deduplication.",
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
            className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-6 flex flex-col gap-2"
          >
            <h2 className="text-base font-normal text-ink-secondary">
              {item.title}
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-surface-elevated/50 rounded-2xl border border-line-subtle p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-normal text-ink-secondary">
            Ready to review your expenses?
          </h3>
          <p className="text-sm text-ink-subtle">
            Return to your overview or open the data importer.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-surface hover:bg-surface-hover border border-line-subtle rounded-full text-sm text-ink-secondary transition-colors"
          >
            Go to Overview
          </Link>
          <Link
            href="/import"
            className="px-5 py-2 bg-cta hover:bg-cta-hover text-cta-ink rounded-full text-sm font-medium transition-colors"
          >
            Import Data
          </Link>
        </div>
      </div>
    </div>
  );
}
