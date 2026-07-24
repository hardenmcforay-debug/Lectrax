-- University partnership package payments (Monime checkout)

CREATE TABLE IF NOT EXISTS university_partnership_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id partnership_package NOT NULL,
  package_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'SLE',
  display_amount_usd NUMERIC(12, 2) NOT NULL CHECK (display_amount_usd > 0),
  billing_cycle TEXT NOT NULL DEFAULT 'yearly',
  university_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  country TEXT NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_provider TEXT NOT NULL DEFAULT 'MONIME',
  monime_payment_id TEXT,
  transaction_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  inquiry_id UUID REFERENCES university_partnership_inquiries(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_university_partnership_payments_status
  ON university_partnership_payments(status);

CREATE INDEX IF NOT EXISTS idx_university_partnership_payments_created_at
  ON university_partnership_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_university_partnership_payments_monime
  ON university_partnership_payments(monime_payment_id)
  WHERE monime_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_university_partnership_payments_email
  ON university_partnership_payments(email);

CREATE TRIGGER university_partnership_payments_updated_at
  BEFORE UPDATE ON university_partnership_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE university_partnership_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read partnership payments"
  ON university_partnership_payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );
