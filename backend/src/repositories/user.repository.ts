import { getSupabaseServerClient } from "../integrations/supabase/client";
import { AppError } from "@glamspot/shared/schemas";
import type { Profile } from "@glamspot/shared/types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getProfile] Error:", error.message);
    throw new AppError(`Failed to fetch profile: ${error.message}`, "DB_ERROR", 500);
  }

  return data as Profile;
}

export async function createProfile(
  userId: string,
  fullName: string | null,
  phone: string | null,
  role: string = "customer",
): Promise<Profile> {
  const supabase = getSupabaseServerClient();

  // Ensure role is a valid enum value
  const validRoles = ["customer", "salon_owner", "admin"];
  const safeRole = validRoles.includes(role) ? role : "customer";

  const payload = { id: userId, full_name: fullName, phone, role: safeRole };
  console.log("[createProfile] Inserting profile:", { userId, payload });

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[createProfile] Insert failed:", {
      userId,
      payload,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });
    throw new AppError(`Database error creating profile: ${error.message}`, "DB_ERROR", 500);
  }

  console.log("[createProfile] Insert succeeded:", { userId, data });
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "full_name" | "phone">>,
): Promise<Profile> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateProfile] Error:", error.message);
    throw new AppError(`Failed to update profile: ${error.message}`, "DB_ERROR", 500);
  }

  return data as Profile;
}
