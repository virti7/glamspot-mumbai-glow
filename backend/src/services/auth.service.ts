import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "../integrations/supabase/client";
import { config } from "../config/env";
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
  role: string = "customer",
): Promise<AuthResponse> {
  const supabase = getSupabaseServerClient();

  console.log("[signUpService] Creating auth user", { email, role });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone || null, role },
  });

  if (authError || !authData.user) {
    console.warn("[signUpService] Auth user creation failed:", authError?.message);
    throw new AppError(authError?.message || "Failed to create account", "AUTH_ERROR", 400);
  }

  const userId = authData.user.id;
  console.log("[signUpService] Auth user created:", userId);

  // Create profile with retry
  console.log("[signUpService] Creating profile");
  let profile;
  try {
    profile = await createProfile(userId, fullName, phone || null, role);
    console.log("[signUpService] Profile created");
  } catch (err: any) {
    console.warn("[signUpService] First profile attempt failed, retrying:", err.message);
    const existing = await getProfile(userId);
    if (existing) {
      profile = existing;
      console.log("[signUpService] Found existing profile");
    } else {
      try {
        profile = await createProfile(userId, fullName, phone || null, role);
        console.log("[signUpService] Profile created on retry");
      } catch (retryErr: any) {
        console.error("[signUpService] Profile creation failed on retry:", retryErr.message);
        throw new AppError(`Failed to create profile: ${retryErr.message}`, "DB_ERROR", 500);
      }
    }
  }

  // Assign free subscription plan
  try {
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
        console.error("[signUpService] Failed to create subscription:", subError.message);
      }
    }
  } catch (subErr: any) {
    console.error("[signUpService] Error setting up subscription:", subErr.message);
  }

  // Sign in to get JWT token (using a throwaway client to avoid polluting the singleton's auth state)
  console.log("[signUpService] Signing in to get token");
  const signInClient = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    throw new AppError("Account created but sign-in failed: " + (signInError?.message || "unknown"), "AUTH_ERROR", 500);
  }

  const subscription = await getUserSubscription(userId);
  console.log("[signUpService] Signup completed");

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
  // Use a throwaway client for sign-in to avoid polluting the service_role singleton
  const signInClient = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await signInClient.auth.signInWithPassword({
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
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, scans_limit")
    .eq("name", "free")
    .single();
  if (error) {
    console.error("[getFreePlan] Failed to find free plan:", error.message);
    return null;
  }
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
