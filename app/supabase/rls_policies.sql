-- check if RLS is enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own transactions
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own transactions
CREATE POLICY "Users can insert their own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own transactions
CREATE POLICY "Users can update their own transactions"
ON transactions FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own transactions
CREATE POLICY "Users can delete their own transactions"
ON transactions FOR DELETE
USING (auth.uid() = user_id);

-- Wallet opening balance support
ALTER TABLE IF EXISTS wallets
  ADD COLUMN IF NOT EXISTS opening_balance BIGINT NOT NULL DEFAULT 0;

-- Fund Goals table & RLS
CREATE TABLE IF NOT EXISTS fund_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount BIGINT NOT NULL DEFAULT 0,
  current_amount BIGINT NOT NULL DEFAULT 0,
  monthly_contribution BIGINT NOT NULL DEFAULT 0,
  target_date TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE fund_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fund_goals"
ON fund_goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Recurring Items table & RLS
CREATE TABLE IF NOT EXISTS recurring_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  amount BIGINT NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_due_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Bills & Utilities',
  wallet TEXT NOT NULL DEFAULT 'Cash',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_reserve BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE recurring_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recurring_items"
ON recurring_items FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fund Plans table & RLS
CREATE TABLE IF NOT EXISTS fund_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  monthly_income_target BIGINT NOT NULL DEFAULT 0,
  needs_percent INT NOT NULL DEFAULT 50,
  wants_percent INT NOT NULL DEFAULT 30,
  savings_percent INT NOT NULL DEFAULT 20,
  reserve_buffer BIGINT NOT NULL DEFAULT 0,
  category_buckets JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE fund_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fund_plans"
ON fund_plans FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
