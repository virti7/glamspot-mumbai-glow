-- Salon Ownership History audit trail
CREATE TABLE IF NOT EXISTS salon_owner_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  old_owner_id UUID REFERENCES profiles(id),
  new_owner_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('claim', 'transfer', 'remove')),
  performed_by_admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_history_salon ON salon_owner_history(salon_id);
CREATE INDEX IF NOT EXISTS idx_owner_history_action ON salon_owner_history(action);

ALTER TABLE salon_owner_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_history_admin_all" ON salon_owner_history
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS salon_owner_history;

-- Add denormalized columns to salon_claims for self-contained claim records
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS salon_name TEXT;
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS verification_message TEXT;

-- Make owner_id nullable in salons to support ownership removal
ALTER TABLE salons ALTER COLUMN owner_id DROP NOT NULL;

-- Add claimed_at if not exists
ALTER TABLE salons ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
