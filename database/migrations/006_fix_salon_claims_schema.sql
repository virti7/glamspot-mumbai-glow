-- Drop the admin_id column from salon_claims (it doesn't exist in live DB)
ALTER TABLE salon_claims DROP COLUMN IF EXISTS admin_id;

-- Add approval/rejection tracking columns
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS approved_by   UUID REFERENCES profiles(id);
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS rejected_by   UUID REFERENCES profiles(id);
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS rejected_at   TIMESTAMPTZ;

-- Add business_email / business_phone if missing
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE salon_claims ADD COLUMN IF NOT EXISTS business_phone TEXT;

-- Update realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS salon_claims;
