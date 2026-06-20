import type { Request, Response, NextFunction } from "express";
import { checkScanLimit } from "../repositories/subscription.repository";

export async function requireScanQuota(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const quota = await checkScanLimit(user.id);

    if (!quota.allowed) {
      res.status(403).json({
        error: "Scan limit reached",
        code: "SCAN_LIMIT_REACHED",
        quota,
      });
      return;
    }

    (req as any).scanQuota = quota;
    next();
  } catch {
    res.status(500).json({ error: "Failed to check scan quota" });
  }
}
