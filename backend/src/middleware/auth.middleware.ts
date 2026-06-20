import type { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "../integrations/supabase/auth";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).user = user;
  next();
}
