-- ============================================================
-- 001_create_tables.sql
-- GlamSpot Mumbai Glow — core tables
-- ============================================================

-- profiles: extends Supabase auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- glam_scans: stores each AI analysis result
CREATE TABLE IF NOT EXISTS glam_scans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  analysis_json JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- appointments: salon bookings
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name     TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE glam_scans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policies: users can only read/write their own rows
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "glam_scans_select_own"
  ON glam_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "glam_scans_insert_own"
  ON glam_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_select_own"
  ON appointments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "appointments_insert_own"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_update_own"
  ON appointments FOR UPDATE
  USING (auth.uid() = user_id);
