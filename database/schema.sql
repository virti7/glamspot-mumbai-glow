-- ============================================================================
-- GlamSpot — Complete Production-Ready PostgreSQL Schema
-- Platform: Supabase PostgreSQL 15+
-- Target: 100k+ users, 10k+ salons, millions of bookings, AI scan history
-- ============================================================================

-- ============================================================================
-- 0. NOTE ON AUTH SCHEMA
-- This migration intentionally avoids direct REFERENCES or triggers on the
-- auth schema so it can run as any role (dashboard SQL editor, service_role,
-- migration runner). The handle_new_user trigger on auth.users is provided
-- as an optional snippet at the bottom for supabase_admin to apply.
--
-- Profile row creation can also be handled from the application layer after
-- signup (call createProfile() in your auth callback).
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";            -- trigram indexes for search
CREATE EXTENSION IF NOT EXISTS "btree_gin";          -- composite GIN indexes

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

CREATE TYPE user_role          AS ENUM ('customer', 'salon_owner', 'admin');
CREATE TYPE booking_status     AS ENUM ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_status     AS ENUM ('pending', 'completed', 'failed', 'refunded', 'partial_refund');
CREATE TYPE subscription_tier  AS ENUM ('free', 'premium', 'elite');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');
CREATE TYPE scan_type          AS ENUM ('hair', 'skin', 'both');

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles — extends Supabase auth.users with app-specific fields
-- PK matches auth.users.id — enforced by application or by the optional
-- handle_new_user trigger (see bottom of this file).
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY,  -- must match auth.users.id
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'customer',
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  profiles             IS 'Extends Supabase auth.users with GlamSpot-specific profile data and role.';
COMMENT ON COLUMN profiles.role        IS 'Customer, salon_owner, or admin. Controls RLS access.';
COMMENT ON COLUMN profiles.is_onboarded IS 'Whether the user has completed initial onboarding flow.';

-- ----------------------------------------------------------------------------
-- subscription_plans — static plan definitions (FREE / PREMIUM / ELITE)
-- Decoupled from users so you can add yearly, monthly, or coupon variants later.
-- ----------------------------------------------------------------------------
CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            subscription_tier NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  scans_limit     INT,                          -- NULL = unlimited
  images_per_scan INT NOT NULL DEFAULT 1,
  price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly    DECIMAL(10,2) NOT NULL DEFAULT 0,
  features        JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT scans_limit_positive CHECK (scans_limit IS NULL OR scans_limit > 0)
);

COMMENT ON TABLE  subscription_plans          IS 'Static plan catalogue. FREE (1 scan, 1 img), PREMIUM (10, 10), ELITE (unlimited).';
COMMENT ON COLUMN subscription_plans.scans_limit  IS 'Max AI scans allowed. NULL = unlimited.';
COMMENT ON COLUMN subscription_plans.features     IS 'Arbitrary feature flags for UI rendering, e.g. ["analytics", "priority_support"].';

-- ----------------------------------------------------------------------------
-- subscriptions — active & historical subscriptions per user
-- One "active" row per user. Keeps a denormalized scans_limit for fast reads.
-- ----------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status          subscription_status NOT NULL DEFAULT 'active',
  scans_used      INT NOT NULL DEFAULT 0,
  scans_limit     INT,                          -- denormalized from plans for fast check
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  payment_provider       TEXT,                  -- 'stripe' | 'razorpay' | NULL
  payment_provider_sub_id TEXT,                  -- subscription ID from provider
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT scans_used_positive CHECK (scans_used >= 0),
  CONSTRAINT scans_limit_check CHECK (scans_limit IS NULL OR scans_limit >= scans_used),
  CONSTRAINT unique_active_subscription UNIQUE (user_id)  -- one active sub per user
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status);

COMMENT ON TABLE  subscriptions                IS 'Links a user to a plan with usage tracking. Exactly one active row per user.';
COMMENT ON COLUMN subscriptions.scans_limit    IS 'Denormalized from subscription_plans.scans_limit for fast limit checks.';
COMMENT ON COLUMN subscriptions.scans_used     IS 'Incremented by trigger on glam_scans insert. Blocked by CHECK when it would exceed scans_limit.';

-- ----------------------------------------------------------------------------
-- salons — core salon listing entity
-- ----------------------------------------------------------------------------
CREATE TABLE salons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  locality      TEXT,
  city          TEXT NOT NULL DEFAULT 'Mumbai',
  state         TEXT NOT NULL DEFAULT 'Maharashtra',
  pincode       TEXT,
  latitude      DECIMAL(10,7),
  longitude     DECIMAL(10,7),
  rating        DECIMAL(3,2) NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  price_min     DECIMAL(10,2),
  price_max     DECIMAL(10,2),
  cover_image   TEXT,
  logo_image    TEXT,
  amenities     JSONB NOT NULL DEFAULT '[]',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  opening_time  TIME,
  closing_time  TIME,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rating_range CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT price_range CHECK (price_min IS NULL OR price_max IS NULL OR price_min <= price_max)
);

COMMENT ON TABLE  salons                IS 'Salon listing. Every salon is owned by a profile with role = salon_owner.';
COMMENT ON COLUMN salons.slug           IS 'URL-friendly identifier, e.g. "blush-salon-andheri". Used in /salons/[slug] routes.';
COMMENT ON COLUMN salons.price_min      IS 'Lowest service price — used for search filtering & display.';
COMMENT ON COLUMN salons.amenities      IS 'e.g. ["wifi", "parking", "ac", "wheelchair_accessible"]';
COMMENT ON COLUMN salons.tags           IS 'e.g. {"unisex", "luxury", "bridal", "organic"}';

-- ----------------------------------------------------------------------------
-- salon_images — gallery for each salon
-- ----------------------------------------------------------------------------
CREATE TABLE salon_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  alt_text   TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salon_images_salon ON salon_images (salon_id, sort_order);

COMMENT ON TABLE salon_images IS 'Gallery images for a salon. Primary image is shown on search cards.';

-- ----------------------------------------------------------------------------
-- salon_services — services offered by a salon (with pricing)
-- ----------------------------------------------------------------------------
CREATE TABLE salon_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,                    -- e.g. "Hair", "Skin", "Nails", "Bridal"
  duration_minutes INT,
  price            DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2),
  currency         TEXT NOT NULL DEFAULT 'INR',
  is_popular       BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_price CHECK (price >= 0),
  CONSTRAINT discounted_lower CHECK (discounted_price IS NULL OR discounted_price <= price)
);

CREATE INDEX idx_salon_services_salon  ON salon_services (salon_id);
CREATE INDEX idx_salon_services_cat    ON salon_services (salon_id, category);
CREATE INDEX idx_salon_services_active ON salon_services (salon_id, is_active);

COMMENT ON TABLE salon_services IS 'Catalog of services a salon provides, each with its own price & duration.';

-- ----------------------------------------------------------------------------
-- salon_staff — stylists / staff belonging to a salon
-- ----------------------------------------------------------------------------
CREATE TABLE salon_staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT,                          -- e.g. "Senior Stylist", "Colorist", "Nail Artist"
  email      TEXT,
  phone      TEXT,
  bio        TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_salon_staff_salon ON salon_staff (salon_id);

COMMENT ON TABLE salon_staff IS 'Staff members who can be booked for appointments.';

-- ----------------------------------------------------------------------------
-- salon_hours — weekly operating hours (one row per day)
-- ----------------------------------------------------------------------------
CREATE TABLE salon_hours (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),   -- 0=Sun, 6=Sat
  is_closed  BOOLEAN NOT NULL DEFAULT false,
  open_time  TIME,
  close_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_salon_day UNIQUE (salon_id, day_of_week),
  CONSTRAINT valid_hours CHECK (is_closed OR (open_time IS NOT NULL AND close_time IS NOT NULL))
);

COMMENT ON TABLE salon_hours IS 'Operating hours per day of week. Closed days flagged with is_closed.';

-- ----------------------------------------------------------------------------
-- bookings — appointment records
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id            UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id            UUID REFERENCES salon_staff(id) ON DELETE SET NULL,
  status              booking_status NOT NULL DEFAULT 'pending',
  booking_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  total_duration_min  INT NOT NULL,          -- computed from services
  total_amount        DECIMAL(10,2) NOT NULL,
  notes               TEXT,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT positive_total CHECK (total_amount >= 0)
);

CREATE INDEX idx_bookings_user       ON bookings (user_id, booking_date DESC);
CREATE INDEX idx_bookings_salon      ON bookings (salon_id, booking_date DESC);
CREATE INDEX idx_bookings_status     ON bookings (status);
CREATE INDEX idx_bookings_salon_date ON bookings (salon_id, booking_date, status);
CREATE INDEX idx_bookings_date_range ON bookings (booking_date) WHERE status NOT IN ('cancelled', 'no_show');

COMMENT ON TABLE bookings IS 'Appointment bookings. Links customer + salon + staff with date/time and status tracking.';

-- ----------------------------------------------------------------------------
-- booking_services — individual services within a booking (junction)
-- Allows a single booking to bundle multiple services.
-- ----------------------------------------------------------------------------
CREATE TABLE booking_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES salon_services(id) ON DELETE RESTRICT,
  service_name TEXT NOT NULL,                -- snapshot at time of booking
  price        DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_services_booking ON booking_services (booking_id);

COMMENT ON TABLE booking_services IS 'Junction table capturing which services are included in a booking. Prices are snapshotted.';

-- ----------------------------------------------------------------------------
-- payments — payment transactions for bookings
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount                      DECIMAL(10,2) NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'INR',
  status                      payment_status NOT NULL DEFAULT 'pending',
  payment_method              TEXT,              -- card, upi, netbanking, wallet
  payment_provider            TEXT,              -- razorpay, stripe
  payment_provider_payment_id TEXT,
  payment_provider_order_id   TEXT,
  receipt_url                 TEXT,
  refund_amount               DECIMAL(10,2) DEFAULT 0,
  refund_reason               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_payment CHECK (amount > 0),
  CONSTRAINT refund_within_amount CHECK (refund_amount >= 0 AND refund_amount <= amount)
);

CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_user    ON payments (user_id);
CREATE INDEX idx_payments_status  ON payments (status);

COMMENT ON TABLE payments IS 'Payment transactions linked to bookings. Supports partial refunds.';

-- ----------------------------------------------------------------------------
-- glam_scans — AI-powered beauty analysis records
-- Every scan increments the user's subscription scans_used counter.
-- ----------------------------------------------------------------------------
CREATE TABLE glam_scans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_type           scan_type NOT NULL DEFAULT 'hair',
  image_url           TEXT NOT NULL,
  image_storage_path  TEXT,                    -- Supabase Storage path
  thumbnail_url       TEXT,
  analysis_json       JSONB,                   -- full Claude response
  recommendations     JSONB NOT NULL DEFAULT '[]',
  hair_insights       JSONB,                   -- extracted hair-specific analysis
  skin_insights       JSONB,                   -- extracted skin-specific analysis
  ai_model_version    TEXT,
  processing_time_ms  INT,
  is_favorite         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_glam_scans_user   ON glam_scans (user_id, created_at DESC);
CREATE INDEX idx_glam_scans_type   ON glam_scans (user_id, scan_type);
CREATE INDEX idx_glam_scans_fav    ON glam_scans (user_id) WHERE is_favorite = true;

COMMENT ON TABLE glam_scans IS 'AI scan results. Each row = one uploaded image + Claude analysis output. Triggers scan quota.';

-- ----------------------------------------------------------------------------
-- glam_insights — fine-grained, queryable insights extracted from scan JSON
-- Enables "your top hair concerns", "trending skin insights" dashboards.
-- ----------------------------------------------------------------------------
CREATE TABLE glam_insights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id          UUID NOT NULL REFERENCES glam_scans(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type     TEXT NOT NULL,            -- hair_type, scalp_health, skin_tone, concern, etc.
  insight_label    TEXT NOT NULL,            -- "Oily Scalp", "Dry Ends", "Warm Undertone"
  insight_value    TEXT,                     -- the raw value / finding
  confidence_score DECIMAL(5,2),             -- 0.00 - 100.00
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_glam_insights_scan   ON glam_insights (scan_id);
CREATE INDEX idx_glam_insights_user   ON glam_insights (user_id);
CREATE INDEX idx_glam_insights_type   ON glam_insights (user_id, insight_type);

COMMENT ON TABLE glam_insights IS 'Categorical insights extracted from scan analysis. Makes it queryable without parsing JSONB.';

-- ----------------------------------------------------------------------------
-- reviews — customer ratings and feedback for salons
-- ----------------------------------------------------------------------------
CREATE TABLE reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id       UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  rating         INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment        TEXT,
  is_verified    BOOLEAN NOT NULL DEFAULT false,
  images         TEXT[] NOT NULL DEFAULT '{}',
  helpful_count  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_review_per_booking UNIQUE (user_id, salon_id, booking_id)
);

CREATE INDEX idx_reviews_salon   ON reviews (salon_id, created_at DESC);
CREATE INDEX idx_reviews_user    ON reviews (user_id);
CREATE INDEX idx_reviews_rating  ON reviews (salon_id, rating);

COMMENT ON TABLE reviews IS 'Customer reviews with star rating. One review per booking enforced via unique constraint.';

-- ----------------------------------------------------------------------------
-- favorite_salons — user's saved / bookmarked salons
-- ----------------------------------------------------------------------------
CREATE TABLE favorite_salons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_favorite UNIQUE (user_id, salon_id)
);

CREATE INDEX idx_fav_user  ON favorite_salons (user_id);
CREATE INDEX idx_fav_salon ON favorite_salons (salon_id);

COMMENT ON TABLE favorite_salons IS 'Many-to-many: bookmarked salons for quick access.';

-- ----------------------------------------------------------------------------
-- notifications — in-app notifications for users
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,               -- booking_confirmed, booking_reminder, scan_complete, welcome, etc.
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,                       -- arbitrary payload for deep-linking
  is_read    BOOLEAN NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user     ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread   ON notifications (user_id) WHERE is_read = false;

COMMENT ON TABLE notifications IS 'In-app notification feed. Supports deep-linking via JSON data payload.';

-- ----------------------------------------------------------------------------
-- user_activity_logs — audit trail for security & analytics
-- ----------------------------------------------------------------------------
CREATE TABLE user_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,               -- login, scan_upload, booking_created, profile_updated, etc.
  resource_type TEXT,                        -- booking, scan, profile, salon
  resource_id   UUID,
  metadata      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_user   ON user_activity_logs (user_id, created_at DESC);
CREATE INDEX idx_activity_action ON user_activity_logs (action, created_at DESC);

COMMENT ON TABLE user_activity_logs IS 'Immutable audit log for security, compliance, and analytics.';

-- ----------------------------------------------------------------------------
-- salon_analytics_daily — pre-aggregated daily analytics per salon
-- Enables O(1) dashboard queries without scanning raw bookings.
-- ----------------------------------------------------------------------------
CREATE TABLE salon_analytics_daily (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id               UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  date                   DATE NOT NULL,
  total_customers        INT NOT NULL DEFAULT 0,
  new_customers          INT NOT NULL DEFAULT 0,
  returning_customers    INT NOT NULL DEFAULT 0,
  total_bookings         INT NOT NULL DEFAULT 0,
  completed_bookings     INT NOT NULL DEFAULT 0,
  cancelled_bookings     INT NOT NULL DEFAULT 0,
  no_show_bookings       INT NOT NULL DEFAULT 0,
  total_revenue          DECIMAL(12,2) NOT NULL DEFAULT 0,
  avg_booking_value      DECIMAL(10,2) NOT NULL DEFAULT 0,
  popular_service_id     UUID,
  popular_service_name   TEXT,
  popular_service_count  INT NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_daily_analytics UNIQUE (salon_id, date)
);

CREATE INDEX idx_salon_analytics_salon_date ON salon_analytics_daily (salon_id, date DESC);

COMMENT ON TABLE salon_analytics_daily IS 'Pre-computed daily aggregates for the salon owner dashboard. Updated by scheduled job or trigger.';

-- ============================================================================
-- 4. INDEXES — performance at scale
-- ============================================================================

-- --- Salon search / discovery -------------------------------------------------
CREATE INDEX idx_salons_locality        ON salons (locality);
CREATE INDEX idx_salons_rating          ON salons (rating DESC);
CREATE INDEX idx_salons_price_min       ON salons (price_min);
CREATE INDEX idx_salons_price_max       ON salons (price_max);
CREATE INDEX idx_salons_active_verified ON salons (is_active, is_verified) WHERE is_active = true;
CREATE INDEX idx_salons_location_ll     ON salons (latitude, longitude) WHERE latitude IS NOT NULL;

-- Trigram indexes for fuzzy / partial text search
CREATE INDEX idx_salons_name_trgm       ON salons USING GIN (name gin_trgm_ops);
CREATE INDEX idx_salons_locality_trgm   ON salons USING GIN (locality gin_trgm_ops);
CREATE INDEX idx_salons_tags_gin        ON salons USING GIN (tags);

-- --- Booking lookups ----------------------------------------------------------
CREATE INDEX idx_bookings_salon_date_status ON bookings (salon_id, booking_date, status);
CREATE INDEX idx_bookings_user_recent       ON bookings (user_id, created_at DESC);

-- --- Analytics queries --------------------------------------------------------
CREATE INDEX idx_bookings_salon_completed   ON bookings (salon_id) WHERE status = 'completed';
CREATE INDEX idx_payments_salon_completed   ON payments (booking_id, status) WHERE status = 'completed';

-- --- User history -------------------------------------------------------------
CREATE INDEX idx_scans_user_recent  ON glam_scans (user_id, created_at DESC);

-- --- Subscription / plan lookups ----------------------------------------------
CREATE INDEX idx_subs_plan ON subscriptions (plan_id);

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: set_updated_at()
-- Generic trigger function — every row update stamps updated_at = now().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION apply_updated_at_trigger(tbl TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
    tbl
  );
END;
$$;

SELECT apply_updated_at_trigger('profiles');
SELECT apply_updated_at_trigger('subscription_plans');
SELECT apply_updated_at_trigger('subscriptions');
SELECT apply_updated_at_trigger('salons');
SELECT apply_updated_at_trigger('salon_services');
SELECT apply_updated_at_trigger('salon_staff');
SELECT apply_updated_at_trigger('salon_hours');
SELECT apply_updated_at_trigger('bookings');
SELECT apply_updated_at_trigger('payments');
SELECT apply_updated_at_trigger('glam_scans');
SELECT apply_updated_at_trigger('reviews');
SELECT apply_updated_at_trigger('salon_analytics_daily');

-- ----------------------------------------------------------------------------
-- Trigger: after_scan_insert()
-- Automatically increments scans_used on the user's active subscription.
-- Prevents scans when limit would be exceeded (safety net — app should also check).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_scans_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan_limit INT;
  current_used       INT;
BEGIN
  -- Lock the subscription row to prevent race conditions
  SELECT scans_limit, scans_used
  INTO current_plan_limit, current_used
  FROM subscriptions
  WHERE user_id = NEW.user_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription found for user %', NEW.user_id
      USING HINT = 'Ensure the user has an active subscription before uploading scans.';
  END IF;

  -- Check limit (NULL = unlimited)
  IF current_plan_limit IS NOT NULL AND current_used >= current_plan_limit THEN
    RAISE EXCEPTION 'Scan limit reached for user %: % out of % used',
      NEW.user_id, current_used, current_plan_limit
      USING HINT = 'Upgrade to PREMIUM or ELITE for more scans.';
  END IF;

  -- Increment the counter
  UPDATE subscriptions
  SET scans_used = scans_used + 1
  WHERE user_id = NEW.user_id AND status = 'active';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_scans_used
  AFTER INSERT ON glam_scans
  FOR EACH ROW
  EXECUTE FUNCTION increment_scans_used();

-- ----------------------------------------------------------------------------
-- Trigger: handle_new_user() — function only (no trigger on auth.users here)
-- The trigger on auth.users requires supabase_admin privileges and is defined
-- in the optional section at the bottom of this file.
--
-- If you prefer app-level profile creation, call the logic below from your
-- signup callback / API route instead of using the trigger.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
  free_scans   INT;
BEGIN
  INSERT INTO profiles (id, full_name, phone, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'customer'::user_role
    )
  );

  SELECT id, scans_limit INTO free_plan_id, free_scans
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;

  INSERT INTO subscriptions (user_id, plan_id, scans_limit, status, current_period_start)
  VALUES (NEW.id, free_plan_id, free_scans, 'active', now());

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger: update_salon_rating()
-- Recalculates salon rating after a review is inserted / updated / deleted.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_salon_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_salon_id UUID;
BEGIN
  target_salon_id := COALESCE(NEW.salon_id, OLD.salon_id);

  UPDATE salons
  SET
    rating       = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE salon_id = target_salon_id), 0),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE salon_id = target_salon_id)
  WHERE id = target_salon_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_salon_rating_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_salon_rating();

CREATE TRIGGER trg_update_salon_rating_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_salon_rating();

CREATE TRIGGER trg_update_salon_rating_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_salon_rating();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_images          ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_services        ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_hours           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE glam_scans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE glam_insights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_salons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Helper: check if the user has a given role
CREATE OR REPLACE FUNCTION user_has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = required_role
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- Users: read/update own. Admins: read/update all. Salon_owners: read own + own salon customers (via app logic).
-- ----------------------------------------------------------------------------
CREATE POLICY "profiles_select_own"      ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"      ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"      ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin"    ON profiles FOR SELECT USING (user_has_role('admin'));
CREATE POLICY "profiles_update_admin"    ON profiles FOR UPDATE USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- subscription_plans — publicly readable (frontend shows plan picker)
-- ----------------------------------------------------------------------------
CREATE POLICY "plans_select_all"         ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "plans_insert_admin"       ON subscription_plans FOR INSERT WITH CHECK (user_has_role('admin'));
CREATE POLICY "plans_update_admin"       ON subscription_plans FOR UPDATE USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- subscriptions — users see their own
-- ----------------------------------------------------------------------------
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_select_admin" ON subscriptions FOR SELECT USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- salons — public read; owners + admins write
-- ----------------------------------------------------------------------------
CREATE POLICY "salons_select_all"        ON salons FOR SELECT USING (true);
CREATE POLICY "salons_insert_owner"      ON salons FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "salons_update_owner"      ON salons FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "salons_insert_admin"      ON salons FOR INSERT WITH CHECK (user_has_role('admin'));
CREATE POLICY "salons_update_admin"      ON salons FOR UPDATE USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- salon_images — public read (images are shown in gallery); owner/admin write
-- ----------------------------------------------------------------------------
CREATE POLICY "salon_images_select_all"  ON salon_images FOR SELECT USING (true);
CREATE POLICY "salon_images_insert_owner" ON salon_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "salon_images_update_owner" ON salon_images FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "salon_images_insert_admin" ON salon_images FOR INSERT WITH CHECK (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- salon_services — public read; owner/admin write
-- ----------------------------------------------------------------------------
CREATE POLICY "services_select_all"      ON salon_services FOR SELECT USING (true);
CREATE POLICY "services_insert_owner"    ON salon_services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "services_update_owner"    ON salon_services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- salon_staff — public read; owner/admin write
-- ----------------------------------------------------------------------------
CREATE POLICY "staff_select_all"         ON salon_staff FOR SELECT USING (true);
CREATE POLICY "staff_insert_owner"       ON salon_staff FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "staff_update_owner"       ON salon_staff FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- salon_hours — public read; owner/admin write
-- ----------------------------------------------------------------------------
CREATE POLICY "hours_select_all"         ON salon_hours FOR SELECT USING (true);
CREATE POLICY "hours_insert_owner"       ON salon_hours FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "hours_update_owner"       ON salon_hours FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- bookings — customer sees own; salon owner sees their salon's bookings; admin sees all
-- ----------------------------------------------------------------------------
CREATE POLICY "bookings_select_customer" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_select_owner"    ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "bookings_insert_customer" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookings_update_customer" ON bookings FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));
CREATE POLICY "bookings_update_owner"    ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "bookings_select_admin"    ON bookings FOR SELECT USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- booking_services — inherit from booking
-- ----------------------------------------------------------------------------
CREATE POLICY "booking_services_select_customer" ON booking_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid())
);
CREATE POLICY "booking_services_select_owner" ON booking_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b JOIN salons s ON b.salon_id = s.id WHERE b.id = booking_id AND s.owner_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- payments — customer sees own; salon owner sees their payments; admin sees all
-- ----------------------------------------------------------------------------
CREATE POLICY "payments_select_customer" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_select_owner"    ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b JOIN salons s ON b.salon_id = s.id WHERE b.id = booking_id AND s.owner_id = auth.uid())
);
CREATE POLICY "payments_select_admin"    ON payments FOR SELECT USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- glam_scans — customer sees own; service_role (server) can insert
-- ----------------------------------------------------------------------------
CREATE POLICY "scans_select_own"         ON glam_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scans_insert_own"         ON glam_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scans_update_own"         ON glam_scans FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- glam_insights — customer sees own
-- ----------------------------------------------------------------------------
CREATE POLICY "insights_select_own"      ON glam_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_insert_own"      ON glam_insights FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- reviews — public read; customer creates own; owner replies
-- ----------------------------------------------------------------------------
CREATE POLICY "reviews_select_all"       ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own"       ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own"       ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- favorite_salons — user manages own
-- ----------------------------------------------------------------------------
CREATE POLICY "fav_select_own"           ON favorite_salons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own"           ON favorite_salons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete_own"           ON favorite_salons FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- notifications — user sees own
-- ----------------------------------------------------------------------------
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_activity_logs — service_role only (immutable audit trail)
-- ----------------------------------------------------------------------------
CREATE POLICY "activity_select_admin"    ON user_activity_logs FOR SELECT USING (user_has_role('admin'));

-- ----------------------------------------------------------------------------
-- salon_analytics_daily — salon owner sees own; admin sees all
-- ----------------------------------------------------------------------------
CREATE POLICY "analytics_select_owner"   ON salon_analytics_daily FOR SELECT USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "analytics_select_admin"   ON salon_analytics_daily FOR SELECT USING (user_has_role('admin'));

-- ============================================================================
-- 7. STORAGE — bucket definitions & policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Buckets
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('glam-scans',    'glam-scans',    false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('salon-images',  'salon-images',  true,  20971520, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('profile-images','profile-images',true,  5242880,  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS 'GlamSpot storage buckets: glam-scans (private), salon-images (public), profile-images (public).';

-- ----------------------------------------------------------------------------
-- Storage RLS Policies
-- ----------------------------------------------------------------------------

-- --- glam-scans (private — only the owning user can read/write) ---------------
CREATE POLICY "glam_scans_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'glam-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "glam_scans_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'glam-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "glam_scans_select_service_role"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = 'glam-scans');

-- --- salon-images (public — anyone can read; owner/admin can write) ----------
CREATE POLICY "salon_images_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'salon-images');

CREATE POLICY "salon_images_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'salon-images'
    -- owner check: folder name is the salon UUID; verify ownership
    AND EXISTS (
      SELECT 1 FROM salons
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "salon_images_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'salon-images'
    AND user_has_role('admin')
  );

-- --- profile-images (public — user manages own) ------------------------------
CREATE POLICY "profile_images_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_images_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_images_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 8. SEED DATA — default subscription plans
-- ============================================================================
INSERT INTO subscription_plans (name, display_name, scans_limit, images_per_scan, price_monthly, price_yearly, features) VALUES
  ('free',    'Free',    1,  1,  0,    0,    '["1 AI scan (lifetime)", "1 image per scan"]'),
  ('premium', 'Premium', 10, 10, 499,  4999, '["10 AI scans per month", "10 images per scan", "Priority support", "Detailed analysis"]'),
  ('elite',   'Elite',   NULL, NULL, 1499, 14990, '["Unlimited AI scans", "Unlimited images", "Priority support", "Detailed analysis", "Early access to new features"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 9. COMPOSITE TYPES & HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: user_scan_quota — convenient view of remaining scans per user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW user_scan_quota AS
SELECT
  p.id              AS user_id,
  p.full_name,
  sp.name           AS plan_name,
  sp.display_name   AS plan_display_name,
  s.scans_limit,
  s.scans_used,
  CASE
    WHEN s.scans_limit IS NULL THEN -1                           -- unlimited
    ELSE GREATEST(s.scans_limit - s.scans_used, 0)
  END               AS scans_remaining,
  s.status          AS subscription_status,
  s.current_period_end
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
JOIN subscription_plans sp ON sp.id = s.plan_id;

COMMENT ON VIEW user_scan_quota IS 'Convenience view showing remaining AI scan quota per user. scans_remaining = -1 means unlimited.';

-- ----------------------------------------------------------------------------
-- Function: get_salon_analytics(salon_id, start_date, end_date)
-- Returns aggregated analytics for a date range. Complements the daily table.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_salon_analytics(
  p_salon_id  UUID,
  p_start     DATE,
  p_end       DATE
)
RETURNS TABLE (
  total_bookings       BIGINT,
  completed_bookings   BIGINT,
  cancelled_bookings   BIGINT,
  total_revenue        NUMERIC,
  avg_booking_value    NUMERIC,
  unique_customers     BIGINT,
  new_customers        BIGINT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT                                              AS total_bookings,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT          AS completed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT          AS cancelled_bookings,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS total_revenue,
    COALESCE(
      AVG(total_amount) FILTER (WHERE status = 'completed'),
      0
    )                                                             AS avg_booking_value,
    COUNT(DISTINCT user_id)::BIGINT                               AS unique_customers,
    COUNT(DISTINCT user_id) FILTER (
      WHERE user_id IN (
        SELECT user_id FROM bookings
        WHERE salon_id = p_salon_id AND status = 'completed'
        GROUP BY user_id
        HAVING MIN(booking_date) >= p_start
      )
    )::BIGINT                                                     AS new_customers
  FROM bookings
  WHERE salon_id = p_salon_id
    AND booking_date >= p_start
    AND booking_date <= p_end;
END;
$$;

COMMENT ON FUNCTION get_salon_analytics IS 'Aggregated salon analytics for a custom date range. Used for dashboard graphs and exports.';

-- ============================================================================
-- 10. OPTIONAL: auth.users trigger (requires supabase_admin)
-- ============================================================================
-- Run this section ONLY in the Supabase Dashboard SQL Editor, which runs as
-- supabase_admin and has access to the auth schema.
--
-- If you skip this, handle profile + subscription creation from your app:
--   const { data, error } = await supabase.auth.signUp(...);
--   await supabase.from('profiles').insert({ id: data.user.id, full_name: ... });
--   await supabase.from('subscriptions').insert({ user_id: data.user.id, plan_id: freePlanId, ... });
-- ============================================================================

-- CREATE TRIGGER trg_handle_new_user
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_new_user();
