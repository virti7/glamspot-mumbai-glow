-- Salon ownership claims
CREATE TABLE IF NOT EXISTS salon_claims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salon_claims_salon_owner ON salon_claims(salon_id, user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_salon_claims_status ON salon_claims(status);
CREATE INDEX IF NOT EXISTS idx_salon_claims_owner ON salon_claims(user_id);

ALTER TABLE salon_claims ENABLE ROW LEVEL SECURITY;

-- Users can insert their own claims
CREATE POLICY "Authenticated users can create claims"
  ON salon_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
  ON salon_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON salon_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update claims (approve/reject)
CREATE POLICY "Admins can update claims"
  ON salon_claims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE salon_claims;
