# FinTrack

Personal finance tracker built with Next.js App Router, React Query, Tailwind CSS, and an OOP layered backend supporting runtime switching between **MySQL** and **Supabase**.

## Getting Started

Install dependencies with `pnpm`:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Switching Between MySQL and Supabase

1. Copy variables from `.env.example` into `.env.local`.
2. For **MySQL**:
   - Import `database/mysql/schema.sql` into your MySQL 8.0+ instance.
   - Set `DB_PROVIDER="mysql"` and configure `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, and `AUTH_JWT_SECRET`.
3. For **Supabase**:
   - Set `DB_PROVIDER="supabase"` and provide `NEXT_PUBLIC_SUPABASE_PROJECT_URL` and `NEXT_PUBLIC_SUPABASE_API_KEY`.

## Scripts

- `pnpm dev` — Start development server
- `pnpm build` — Build production bundle
- `pnpm start` — Start production server
- `pnpm test` — Run backend unit tests
