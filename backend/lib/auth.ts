import { getSupabaseServerClient } from "./supabase.server";

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract the Bearer token from a Request's Authorization header. */
function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ── Public API ───────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string | null;
  full_name: string | null;
};

/**
 * Verify the current request's Bearer token against Supabase Auth.
 * Returns the authenticated user or null.
 */
export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

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

/**
 * Require an authenticated user — throws a 401 Response if not present.
 */
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
