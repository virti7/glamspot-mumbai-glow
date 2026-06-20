-- ============================================================================
-- GlamSpot — SQL Part 1: Foundation
-- Extensions, Enums, Tables, Indexes
-- ============================================================================
-- Run this first. Safe to run as any role (no auth schema dependency).
-- ============================================================================

-- ============================================================================
-- NOTE ON AUTH SCHEMA
-- This file intentionally avoids direct REFERENCES or triggers on the auth
-- schema so it can run as any role (dashboard SQL editor, service_role,
-- migration runner). The handle_new_user trigger on auth.users is in sql3.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

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

-- profiles
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

-- subscription_plans
CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            subscription_tier NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  scans_limit     INT,
  images_per_scan INT,                     -- NULL = unlimited
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

-- subscriptions
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status          subscription_status NOT NULL DEFAULT 'active',
  scans_used      INT NOT NULL DEFAULT 0,
  scans_limit     INT,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  auto_renew      BOOLEAN NOT NULL DEFAULT false,
  payment_provider       TEXT,
  payment_provider_sub_id TEXT,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scans_used_positive CHECK (scans_used >= 0),
  CONSTRAINT scans_limit_check CHECK (scans_limit IS NULL OR scans_limit >= scans_used),
  CONSTRAINT unique_active_subscription UNIQUE (user_id)
);
CREATE INDEX idx_subscriptions_user_status ON subscriptions (user_id, status);
COMMENT ON TABLE  subscriptions                IS 'Links a user to a plan with usage tracking. Exactly one active row per user.';
COMMENT ON COLUMN subscriptions.scans_limit    IS 'Denormalized from subscription_plans.scans_limit for fast limit checks.';
COMMENT ON COLUMN subscriptions.scans_used     IS 'Incremented by trigger on glam_scans insert.';

-- salons
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
COMMENT ON COLUMN salons.slug           IS 'URL-friendly identifier, e.g. "blush-salon-andheri".';
COMMENT ON COLUMN salons.price_min      IS 'Lowest service price — used for search filtering & display.';
COMMENT ON COLUMN salons.amenities      IS 'e.g. ["wifi", "parking", "ac", "wheelchair_accessible"]';
COMMENT ON COLUMN salons.tags           IS 'e.g. {"unisex", "luxury", "bridal", "organic"}';

-- salon_images
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

-- salon_services
CREATE TABLE salon_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id         UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
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

-- salon_staff
CREATE TABLE salon_staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT,
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

-- salon_hours
CREATE TABLE salon_hours (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id   UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_closed  BOOLEAN NOT NULL DEFAULT false,
  open_time  TIME,
  close_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_salon_day UNIQUE (salon_id, day_of_week),
  CONSTRAINT valid_hours CHECK (is_closed OR (open_time IS NOT NULL AND close_time IS NOT NULL))
);
COMMENT ON TABLE salon_hours IS 'Operating hours per day of week. Closed days flagged with is_closed.';

-- bookings
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id            UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id            UUID REFERENCES salon_staff(id) ON DELETE SET NULL,
  status              booking_status NOT NULL DEFAULT 'pending',
  booking_date        DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  total_duration_min  INT NOT NULL,
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

-- booking_services
CREATE TABLE booking_services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES salon_services(id) ON DELETE RESTRICT,
  service_name TEXT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_services_booking ON booking_services (booking_id);
COMMENT ON TABLE booking_services IS 'Junction table capturing which services are included in a booking. Prices are snapshotted.';

-- payments
CREATE TABLE payments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount                      DECIMAL(10,2) NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'INR',
  status                      payment_status NOT NULL DEFAULT 'pending',
  payment_method              TEXT,
  payment_provider            TEXT,
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

-- glam_scans
CREATE TABLE glam_scans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_type           scan_type NOT NULL DEFAULT 'hair',
  image_url           TEXT NOT NULL,
  image_storage_path  TEXT,
  thumbnail_url       TEXT,
  analysis_json       JSONB,
  recommendations     JSONB NOT NULL DEFAULT '[]',
  hair_insights       JSONB,
  skin_insights       JSONB,
  ai_model_version    TEXT,
  processing_time_ms  INT,
  is_favorite         BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_glam_scans_user   ON glam_scans (user_id, created_at DESC);
CREATE INDEX idx_glam_scans_type   ON glam_scans (user_id, scan_type);
CREATE INDEX idx_glam_scans_fav    ON glam_scans (user_id) WHERE is_favorite = true;
COMMENT ON TABLE glam_scans IS 'AI scan results. Each row = one uploaded image + Claude analysis output.';

-- glam_insights
CREATE TABLE glam_insights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id          UUID NOT NULL REFERENCES glam_scans(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type     TEXT NOT NULL,
  insight_label    TEXT NOT NULL,
  insight_value    TEXT,
  confidence_score DECIMAL(5,2),
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_glam_insights_scan   ON glam_insights (scan_id);
CREATE INDEX idx_glam_insights_user   ON glam_insights (user_id);
CREATE INDEX idx_glam_insights_type   ON glam_insights (user_id, insight_type);
COMMENT ON TABLE glam_insights IS 'Categorical insights extracted from scan analysis. Makes it queryable without parsing JSONB.';

-- reviews
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

-- favorite_salons
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

-- notifications
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user     ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread   ON notifications (user_id) WHERE is_read = false;
COMMENT ON TABLE notifications IS 'In-app notification feed. Supports deep-linking via JSON data payload.';

-- user_activity_logs
CREATE TABLE user_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   UUID,
  metadata      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_user   ON user_activity_logs (user_id, created_at DESC);
CREATE INDEX idx_activity_action ON user_activity_logs (action, created_at DESC);
COMMENT ON TABLE user_activity_logs IS 'Immutable audit log for security, compliance, and analytics.';

-- salon_analytics_daily
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
COMMENT ON TABLE salon_analytics_daily IS 'Pre-computed daily aggregates for the salon owner dashboard.';

-- ============================================================================
-- 4. ADDITIONAL INDEXES — performance at scale
-- ============================================================================

-- Salon search / discovery
CREATE INDEX idx_salons_locality        ON salons (locality);
CREATE INDEX idx_salons_rating          ON salons (rating DESC);
CREATE INDEX idx_salons_price_min       ON salons (price_min);
CREATE INDEX idx_salons_price_max       ON salons (price_max);
CREATE INDEX idx_salons_active_verified ON salons (is_active, is_verified) WHERE is_active = true;
CREATE INDEX idx_salons_location_ll     ON salons (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_salons_name_trgm       ON salons USING GIN (name gin_trgm_ops);
CREATE INDEX idx_salons_locality_trgm   ON salons USING GIN (locality gin_trgm_ops);
CREATE INDEX idx_salons_tags_gin        ON salons USING GIN (tags);

-- Booking lookups
CREATE INDEX idx_bookings_salon_date_status ON bookings (salon_id, booking_date, status);
CREATE INDEX idx_bookings_user_recent       ON bookings (user_id, created_at DESC);

-- Analytics queries
CREATE INDEX idx_bookings_salon_completed   ON bookings (salon_id) WHERE status = 'completed';
CREATE INDEX idx_payments_salon_completed   ON payments (booking_id, status) WHERE status = 'completed';

-- User history
CREATE INDEX idx_scans_user_recent  ON glam_scans (user_id, created_at DESC);

-- Subscription / plan lookups
CREATE INDEX idx_subs_plan ON subscriptions (plan_id);
