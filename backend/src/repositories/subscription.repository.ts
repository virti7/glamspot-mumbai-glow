import { getSupabaseServerClient } from "../integrations/supabase/client";
import { AppError } from "@glamspot/shared/schemas";

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  scans_used: number;
  scans_limit: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  created_at: string;
}

export interface SubscriptionWithPlan extends SubscriptionRecord {
  plan_name: string;
  plan_display_name: string;
  scans_remaining: number;
}

export async function getUserSubscription(userId: string): Promise<SubscriptionWithPlan | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_scan_quota")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new AppError(`Failed to fetch subscription: ${error.message}`, "DB_ERROR", 500);
  }

  return {
    id: "",
    user_id: userId,
    plan_id: "",
    status: data.subscription_status,
    scans_used: data.scans_used,
    scans_limit: data.scans_limit,
    current_period_start: null,
    current_period_end: data.current_period_end,
    auto_renew: false,
    created_at: "",
    plan_name: data.plan_name,
    plan_display_name: data.plan_display_name,
    scans_remaining: data.scans_remaining,
  };
}

export async function checkScanLimit(userId: string): Promise<{ allowed: boolean; scansUsed: number; scansLimit: number | null; remaining: number }> {
  const sub = await getUserSubscription(userId);

  if (!sub) {
    return { allowed: false, scansUsed: 0, scansLimit: 0, remaining: 0 };
  }

  if (sub.scans_limit === null) {
    return { allowed: true, scansUsed: sub.scans_used, scansLimit: null, remaining: -1 };
  }

  const remaining = Math.max(0, sub.scans_limit - sub.scans_used);

  return {
    allowed: remaining > 0,
    scansUsed: sub.scans_used,
    scansLimit: sub.scans_limit,
    remaining,
  };
}

export async function getAllPlans(): Promise<Array<{
  id: string;
  name: string;
  display_name: string;
  scans_limit: number | null;
  images_per_scan: number;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}>> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) {
    throw new AppError(`Failed to fetch plans: ${error.message}`, "DB_ERROR", 500);
  }

  return (data ?? []).map(p => ({
    ...p,
    features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
  }));
}
