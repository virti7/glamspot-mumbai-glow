-- ============================================================
-- GlamSpot Mumbai Glow — Database Schema Reference
-- ============================================================
-- This file documents the database schema for reference.
-- Actual migrations are in ../migrations/
-- ============================================================

-- profiles: extends Supabase auth.users with app-specific fields
-- Table: profiles
--   id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
--   full_name  TEXT
--   phone      TEXT
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()

-- glam_scans: stores each AI analysis result
-- Table: glam_scans
--   id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
--   user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
--   image_url     TEXT NOT NULL
--   analysis_json JSONB NOT NULL
--   created_at    TIMESTAMPTZ NOT NULL DEFAULT now()

-- appointments: salon bookings
-- Table: appointments
--   id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
--   user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
--   service_name     TEXT NOT NULL
--   appointment_date TIMESTAMPTZ NOT NULL
--   status           TEXT NOT NULL DEFAULT 'pending'
--                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
--   created_at       TIMESTAMPTZ NOT NULL DEFAULT now()

-- ============================================================
-- Row Level Security (RLS) is enabled on all tables
-- Policies ensure users can only access their own data
-- ============================================================
