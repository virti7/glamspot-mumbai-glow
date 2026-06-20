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
    throw new AppError(`Failed to fetch profile: ${error.message}`, "DB_ERROR", 500);
  }

  return data as Profile;
}

export async function createProfile(
  userId: string,
  fullName: string | null,
  phone: string | null,
): Promise<Profile> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      full_name: fullName,
      phone,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(`Failed to create profile: ${error.message}`, "DB_ERROR", 500);
  }

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
    throw new AppError(`Failed to update profile: ${error.message}`, "DB_ERROR", 500);
  }

  return data as Profile;
}
