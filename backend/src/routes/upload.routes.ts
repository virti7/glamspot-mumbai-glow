import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadScanService } from "../services/scan.service";

export const uploadRouter = Router();

uploadRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;
    const result = await uploadScanService(req as any, imageBase64, mediaType);
    res.json(result);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
});
