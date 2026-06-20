-- ============================================================================
-- GlamSpot — SQL Part 3: Seed Data, Views & Functions
-- ============================================================================
-- Prerequisites: sql1_foundation.sql + sql2_triggers_rls_storage.sql
-- ============================================================================

-- ============================================================================
-- 8. SEED DATA — default subscription plans
-- ============================================================================
INSERT INTO subscription_plans (name, display_name, scans_limit, images_per_scan, price_monthly, price_yearly, features) VALUES
  ('free',    'Free',    1,  1,  0,    0,    '["1 AI scan (lifetime)", "1 image per scan"]'),
  ('premium', 'Premium', 10, 10, 499,  4999, '["10 AI scans per month", "10 images per scan", "Priority support", "Detailed analysis"]'),
  ('elite',   'Elite',   NULL, NULL, 1499, 14990, '["Unlimited AI scans", "Unlimited images", "Priority support", "Detailed analysis", "Early access to new features"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 9. VIEWS & HELPER FUNCTIONS
-- ============================================================================

-- View: remaining scan quota per user
CREATE OR REPLACE VIEW user_scan_quota AS
SELECT
  p.id              AS user_id,
  p.full_name,
  sp.name           AS plan_name,
  sp.display_name   AS plan_display_name,
  s.scans_limit,
  s.scans_used,
  CASE
    WHEN s.scans_limit IS NULL THEN -1
    ELSE GREATEST(s.scans_limit - s.scans_used, 0)
  END               AS scans_remaining,
  s.status          AS subscription_status,
  s.current_period_end
FROM profiles p
JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
JOIN subscription_plans sp ON sp.id = s.plan_id;

COMMENT ON VIEW user_scan_quota IS 'Convenience view showing remaining AI scan quota per user. scans_remaining = -1 means unlimited.';

-- Function: get_salon_analytics(salon_id, start_date, end_date)
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
-- ✅ sql3 is complete — all runnable SQL, no optional sections.
--
-- For auto profile creation on signup, see: sql4_auth_trigger_optional.sql
-- ============================================================================
