import type { Request, Response, NextFunction } from "express";
import { getSupabaseServerClient } from "../integrations/supabase/client";

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const supabase = getSupabaseServerClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || !roles.includes(profile.role)) {
        res.status(403).json({ error: "Forbidden: insufficient permissions" });
        return;
      }

      (req as any).userRole = profile.role;
      next();
    } catch {
      res.status(500).json({ error: "Failed to verify role" });
    }
  };
}

export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role ?? null;
}
