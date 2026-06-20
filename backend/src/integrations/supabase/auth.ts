import type { Request } from "express";
import { getSupabaseServerClient } from "./client";

export interface AuthUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

export async function getUserFromToken(token: string): Promise<AuthUser | null> {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      full_name: user.user_metadata?.full_name ?? null,
    };
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return getUserFromToken(token);
}

export async function requireUser(request: Request): Promise<AuthUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
