import { getUserFromRequest } from "../integrations/supabase/auth";
import { getProfile, createProfile, updateProfile } from "../repositories/user.repository";
import { UnauthorizedError } from "@glamspot/shared/schemas";
import type { Profile } from "@glamspot/shared/types";

export async function getProfileService(request: Request): Promise<Profile> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to view your profile.");
  }

  let profile = await getProfile(user.id);
  if (!profile) {
    profile = await createProfile(user.id, user.full_name, null);
  }

  return profile;
}

export async function updateProfileService(
  request: Request,
  updates: Partial<Pick<Profile, "full_name" | "phone">>,
): Promise<Profile> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to update your profile.");
  }

  return updateProfile(user.id, updates);
}
