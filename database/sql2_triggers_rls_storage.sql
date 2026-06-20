-- ============================================================================
-- GlamSpot — SQL Part 2: Triggers, RLS & Storage
-- ============================================================================
-- Prerequisite: run sql1_foundation.sql first.
-- ============================================================================

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Generic set_updated_at() trigger function
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

-- Trigger: increment scans_used after a glam_scans insert
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
  SELECT scans_limit, scans_used
  INTO current_plan_limit, current_used
  FROM subscriptions
  WHERE user_id = NEW.user_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active subscription found for user %', NEW.user_id
      USING HINT = 'Ensure the user has an active subscription before uploading scans.';
  END IF;

  IF current_plan_limit IS NOT NULL AND current_used >= current_plan_limit THEN
    RAISE EXCEPTION 'Scan limit reached for user %: % out of % used',
      NEW.user_id, current_used, current_plan_limit
      USING HINT = 'Upgrade to PREMIUM or ELITE for more scans.';
  END IF;

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

-- handle_new_user function (no trigger on auth.users — see sql3 for optional trigger)
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

-- Trigger: update salon rating after review changes
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
-- 6. ROW LEVEL SECURITY
-- ============================================================================

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

-- Helper function for role checks
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

-- Profiles
CREATE POLICY "profiles_select_own"      ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own"      ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"      ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin"    ON profiles FOR SELECT USING (user_has_role('admin'));
CREATE POLICY "profiles_update_admin"    ON profiles FOR UPDATE USING (user_has_role('admin'));

-- Subscription plans
CREATE POLICY "plans_select_all"         ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "plans_insert_admin"       ON subscription_plans FOR INSERT WITH CHECK (user_has_role('admin'));
CREATE POLICY "plans_update_admin"       ON subscription_plans FOR UPDATE USING (user_has_role('admin'));

-- Subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_select_admin" ON subscriptions FOR SELECT USING (user_has_role('admin'));

-- Salons
CREATE POLICY "salons_select_all"        ON salons FOR SELECT USING (true);
CREATE POLICY "salons_insert_owner"      ON salons FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "salons_update_owner"      ON salons FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "salons_insert_admin"      ON salons FOR INSERT WITH CHECK (user_has_role('admin'));
CREATE POLICY "salons_update_admin"      ON salons FOR UPDATE USING (user_has_role('admin'));

-- Salon images
CREATE POLICY "salon_images_select_all"  ON salon_images FOR SELECT USING (true);
CREATE POLICY "salon_images_insert_owner" ON salon_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "salon_images_update_owner" ON salon_images FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "salon_images_insert_admin" ON salon_images FOR INSERT WITH CHECK (user_has_role('admin'));

-- Salon services
CREATE POLICY "services_select_all"      ON salon_services FOR SELECT USING (true);
CREATE POLICY "services_insert_owner"    ON salon_services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "services_update_owner"    ON salon_services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);

-- Salon staff
CREATE POLICY "staff_select_all"         ON salon_staff FOR SELECT USING (true);
CREATE POLICY "staff_insert_owner"       ON salon_staff FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "staff_update_owner"       ON salon_staff FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);

-- Salon hours
CREATE POLICY "hours_select_all"         ON salon_hours FOR SELECT USING (true);
CREATE POLICY "hours_insert_owner"       ON salon_hours FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "hours_update_owner"       ON salon_hours FOR UPDATE USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);

-- Bookings
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

-- Booking services
CREATE POLICY "booking_services_select_customer" ON booking_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid())
);
CREATE POLICY "booking_services_select_owner" ON booking_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b JOIN salons s ON b.salon_id = s.id WHERE b.id = booking_id AND s.owner_id = auth.uid())
);

-- Payments
CREATE POLICY "payments_select_customer" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payments_select_owner"    ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings b JOIN salons s ON b.salon_id = s.id WHERE b.id = booking_id AND s.owner_id = auth.uid())
);
CREATE POLICY "payments_select_admin"    ON payments FOR SELECT USING (user_has_role('admin'));

-- Glam scans
CREATE POLICY "scans_select_own"         ON glam_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scans_insert_own"         ON glam_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scans_update_own"         ON glam_scans FOR UPDATE USING (auth.uid() = user_id);

-- Glam insights
CREATE POLICY "insights_select_own"      ON glam_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insights_insert_own"      ON glam_insights FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE POLICY "reviews_select_all"       ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own"       ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own"       ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- Favorite salons
CREATE POLICY "fav_select_own"           ON favorite_salons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own"           ON favorite_salons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete_own"           ON favorite_salons FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- User activity logs
CREATE POLICY "activity_select_admin"    ON user_activity_logs FOR SELECT USING (user_has_role('admin'));

-- Salon analytics daily
CREATE POLICY "analytics_select_owner"   ON salon_analytics_daily FOR SELECT USING (
  EXISTS (SELECT 1 FROM salons WHERE id = salon_id AND owner_id = auth.uid())
);
CREATE POLICY "analytics_select_admin"   ON salon_analytics_daily FOR SELECT USING (user_has_role('admin'));

-- ============================================================================
-- 7. STORAGE — buckets & policies
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('glam-scans',    'glam-scans',    false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('salon-images',  'salon-images',  true,  20971520, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('profile-images','profile-images',true,  5242880,  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- glam-scans (private — only owning user can read/write)
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

-- salon-images (public read; owner/admin write)
CREATE POLICY "salon_images_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'salon-images');

CREATE POLICY "salon_images_insert_owner"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'salon-images'
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

-- profile-images (public read; user manages own)
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
