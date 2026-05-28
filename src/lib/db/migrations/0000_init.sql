-- DunningBee Initial Schema Migration
-- Run against your Supabase Postgres database

-- Enums
CREATE TYPE plan_tier AS ENUM ('starter', 'growth', 'scale');
CREATE TYPE dunning_step AS ENUM ('friendly_reminder', 'card_update', 'last_chance');
CREATE TYPE sequence_status AS ENUM ('active', 'recovered', 'exhausted', 'cancelled');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');
CREATE TYPE payment_status AS ENUM ('failed', 'retrying', 'recovered', 'abandoned');

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  company_name TEXT,
  plan_tier plan_tier NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stripe Connections
CREATE TABLE stripe_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  livemode BOOLEAN NOT NULL DEFAULT false,
  scope TEXT,
  business_name TEXT,
  connected BOOLEAN NOT NULL DEFAULT true,
  webhook_endpoint_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ
);

CREATE INDEX stripe_conn_account_idx ON stripe_connections(account_id);
CREATE INDEX stripe_conn_stripe_acct_idx ON stripe_connections(stripe_account_id);

-- Failed Payments
CREATE TABLE failed_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_connection_id UUID NOT NULL REFERENCES stripe_connections(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  failure_code TEXT,
  failure_message TEXT,
  status payment_status NOT NULL DEFAULT 'failed',
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovered_amount_cents INTEGER,
  failed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

CREATE INDEX fp_account_idx ON failed_payments(account_id);
CREATE INDEX fp_status_idx ON failed_payments(status);
CREATE INDEX fp_next_retry_idx ON failed_payments(next_retry_at);
CREATE INDEX fp_invoice_idx ON failed_payments(stripe_invoice_id);

-- Dunning Sequences
CREATE TABLE dunning_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failed_payment_id UUID NOT NULL REFERENCES failed_payments(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  current_step dunning_step NOT NULL DEFAULT 'friendly_reminder',
  status sequence_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ds_account_idx ON dunning_sequences(account_id);
CREATE INDEX ds_status_idx ON dunning_sequences(status);

-- Dunning Emails
CREATE TABLE dunning_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES dunning_sequences(id) ON DELETE CASCADE,
  step dunning_step NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status email_status NOT NULL DEFAULT 'pending',
  resend_message_id TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX de_sequence_idx ON dunning_emails(sequence_id);
CREATE INDEX de_scheduled_idx ON dunning_emails(scheduled_for);
CREATE INDEX de_status_idx ON dunning_emails(status);

-- Dunning Settings
CREATE TABLE dunning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  retry_delay_1_hours INTEGER NOT NULL DEFAULT 1,
  retry_delay_2_hours INTEGER NOT NULL DEFAULT 24,
  retry_delay_3_hours INTEGER NOT NULL DEFAULT 72,
  email_delay_1_hours INTEGER NOT NULL DEFAULT 1,
  email_delay_2_hours INTEGER NOT NULL DEFAULT 48,
  email_delay_3_hours INTEGER NOT NULL DEFAULT 120,
  sender_name TEXT DEFAULT 'Billing',
  reply_to_email TEXT,
  email_subject_1 TEXT DEFAULT 'Your payment didn''t go through',
  email_subject_2 TEXT DEFAULT 'Action needed: please update your card',
  email_subject_3 TEXT DEFAULT 'Last chance to keep your subscription',
  notify_on_failure BOOLEAN NOT NULL DEFAULT true,
  notify_on_recovery BOOLEAN NOT NULL DEFAULT true,
  notification_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recovery Events
CREATE TABLE recovery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  failed_payment_id UUID NOT NULL REFERENCES failed_payments(id) ON DELETE CASCADE,
  recovery_method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  recovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX re_account_idx ON recovery_events(account_id);
CREATE INDEX re_recovered_at_idx ON recovery_events(recovered_at);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own account" ON accounts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own connections" ON stripe_connections
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own payments" ON failed_payments
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own sequences" ON dunning_sequences
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own emails" ON dunning_emails
  FOR ALL USING (sequence_id IN (
    SELECT id FROM dunning_sequences WHERE account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can view own settings" ON dunning_settings
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own recovery events" ON recovery_events
  FOR ALL USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));
