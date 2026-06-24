-- Fix salon_claims RLS policies to use user_id (matching live schema)

-- Drop old policies from original migration (they reference owner_id which no longer exists)
DROP POLICY IF EXISTS "salon_claims_owner_select" ON salon_claims;
DROP POLICY IF EXISTS "salon_claims_owner_insert" ON salon_claims;
DROP POLICY IF EXISTS "salon_claims_admin_all" ON salon_claims;

-- 1. Authenticated users can insert their own claims
CREATE POLICY "Authenticated users can create claims"
  ON salon_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Users can view their own claims
CREATE POLICY "Users can view own claims"
  ON salon_claims
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Admins can view all claims
CREATE POLICY "Admins can view all claims"
  ON salon_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Admins can update claims (approve/reject)
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
