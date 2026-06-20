import { getSupabaseServerClient } from "../integrations/supabase/client";
import { getProfile, createProfile } from "../repositories/user.repository";
import { AppError, UnauthorizedError } from "@glamspot/shared/schemas";

export interface AuthResponse {
  user: {
    id: string;
    email: string | null;
  };
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
  };
  subscription: {
    plan_name: string;
    display_name: string;
    scans_limit: number | null;
    scans_used: number;
    scans_remaining: number;
    status: string;
  } | null;
  token: string;
}

export async function signUpService(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
): Promise<AuthResponse> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone || null },
  });

  if (authError || !authData.user) {
    throw new AppError(authError?.message || "Failed to create account", "AUTH_ERROR", 400);
  }

  const userId = authData.user.id;

  let profile;
  try {
    profile = await createProfile(userId, fullName, phone || null);
  } catch {
    const existing = await getProfile(userId);
    if (existing) {
      profile = existing;
    } else {
      profile = await createProfile(userId, fullName, phone || null);
    }
  }

  const freePlan = await getFreePlan();
  if (freePlan) {
    const { error: subError } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan_id: freePlan.id,
      scans_limit: freePlan.scans_limit,
      status: "active",
      current_period_start: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (subError) {
      console.error("Failed to create subscription:", subError);
    }
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    throw new AppError("Account created but sign-in failed", "AUTH_ERROR", 500);
  }

  const subscription = await getUserSubscription(userId);

  return {
    user: { id: userId, email: authData.user.email ?? null },
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: (profile as any).avatar_url || null,
      role: (profile as any).role || "customer",
      created_at: profile.created_at,
    },
    subscription,
    token: signInData.session.access_token,
  };
}

export async function signInService(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new AppError(error?.message || "Invalid email or password", "AUTH_ERROR", 401);
  }

  const userId = data.user.id;
  let profile = await getProfile(userId);

  if (!profile) {
    profile = await createProfile(
      userId,
      data.user.user_metadata?.full_name || null,
      data.user.user_metadata?.phone || null,
    );
  }

  const subscription = await getUserSubscription(userId);

  return {
    user: { id: userId, email: data.user.email ?? null },
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: (profile as any).avatar_url || null,
      role: (profile as any).role || "customer",
      created_at: profile.created_at,
    },
    subscription,
    token: data.session.access_token,
  };
}

export async function getSessionService(token: string): Promise<AuthResponse> {
  const supabase = getSupabaseServerClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new UnauthorizedError("Invalid session");
  }

  const userId = user.id;
  let profile = await getProfile(userId);
  if (!profile) {
    profile = await createProfile(userId, user.user_metadata?.full_name || null, user.user_metadata?.phone || null);
  }

  const subscription = await getUserSubscription(userId);

  return {
    user: { id: userId, email: user.email ?? null },
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar_url: (profile as any).avatar_url || null,
      role: (profile as any).role || "customer",
      created_at: profile.created_at,
    },
    subscription,
    token,
  };
}

async function getFreePlan(): Promise<{ id: string; scans_limit: number | null } | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("id, scans_limit")
    .eq("name", "free")
    .single();
  return data;
}

async function getUserSubscription(userId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("user_scan_quota")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    plan_name: data.plan_name,
    display_name: data.plan_display_name,
    scans_limit: data.scans_limit,
    scans_used: data.scans_used,
    scans_remaining: data.scans_remaining,
    status: data.subscription_status,
  };
}
