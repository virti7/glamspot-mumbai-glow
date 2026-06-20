-- ============================================================================
-- GlamSpot — SQL Part 4: Optional auth.users Trigger
-- ============================================================================
-- This file is OPTIONAL. Run it ONLY if you want auto profile + subscription
-- creation on user signup (without writing any app code for it).
--
-- REQUIREMENT: Must run in the Supabase Dashboard SQL Editor (or as
-- supabase_admin) because it creates a trigger on the auth schema.
-- ============================================================================
--
-- If you SKIP this file, handle profile creation from your app after signup:
--
--   const { data, error } = await supabase.auth.signUp({
--     email, password,
--     options: { data: { full_name } }
--   });
--   if (data.user) {
--     await supabase.from('profiles').insert({ id: data.user.id, full_name });
--     const { data: freePlan } = await supabase
--       .from('subscription_plans')
--       .select('id, scans_limit')
--       .eq('name', 'free')
--       .single();
--     await supabase.from('subscriptions').insert({
--       user_id: data.user.id,
--       plan_id: freePlan.id,
--       scans_limit: freePlan.scans_limit,
--       status: 'active',
--       current_period_start: new Date().toISOString()
--     });
--   }
-- ============================================================================

-- The handle_new_user() function was already created in sql2.
-- This trigger attaches it to auth.users.

CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
