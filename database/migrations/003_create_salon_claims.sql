-- Salon ownership claims
CREATE TABLE IF NOT EXISTS salon_claims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id    UUID REFERENCES profiles(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salon_claims_salon_owner ON salon_claims(salon_id, owner_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_salon_claims_status ON salon_claims(status);
CREATE INDEX IF NOT EXISTS idx_salon_claims_owner ON salon_claims(owner_id);

ALTER TABLE salon_claims ENABLE ROW LEVEL SECURITY;

-- Salon owners can view their own claims
CREATE POLICY "salon_claims_owner_select" ON salon_claims
  FOR SELECT USING (owner_id = auth.uid());

-- Salon owners can create claims
CREATE POLICY "salon_claims_owner_insert" ON salon_claims
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Admins can see all claims and update them
CREATE POLICY "salon_claims_admin_all" ON salon_claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE salon_claims;
