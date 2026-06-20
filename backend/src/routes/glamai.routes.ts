import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireScanQuota } from "../middleware/subscription.middleware";
import { uploadScanService } from "../services/scan.service";
import { analyzeScanService } from "../services/analysis.service";
import { getUserFromRequest } from "../integrations/supabase/auth";
import { getUserScans } from "../repositories/scan.repository";
import { checkScanLimit } from "../repositories/subscription.repository";
import { UnauthorizedError } from "@glamspot/shared/schemas";

export const glamaiRouter = Router();

glamaiRouter.get("/quota", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const quota = await checkScanLimit(user.id);
    res.json(quota);
  } catch {
    res.status(500).json({ error: "Failed to check quota" });
  }
});

glamaiRouter.post("/upload", authMiddleware, requireScanQuota, async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;
    const result = await uploadScanService(req as any, imageBase64, mediaType);
    res.json(result);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else if (error instanceof UnauthorizedError) {
      res.status(401).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to upload scan" });
    }
  }
});

glamaiRouter.post("/analyze", authMiddleware, async (req, res) => {
  try {
    const { scanId, imageUrl } = req.body;
    const result = await analyzeScanService(scanId, imageUrl);
    res.json(result);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to analyze scan" });
    }
  }
});

glamaiRouter.get("/scans", authMiddleware, async (req, res) => {
  try {
    const user = await getUserFromRequest(req as any);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await getUserScans(user.id, offset, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch scans" });
  }
});
