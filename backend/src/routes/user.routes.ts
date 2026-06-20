import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getProfileService, updateProfileService } from "../services/user.service";

export const userRouter = Router();

userRouter.get("/profile", authMiddleware, async (req, res) => {
  try {
    const profile = await getProfileService(req as any);
    res.json(profile);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  }
});

userRouter.put("/profile", authMiddleware, async (req, res) => {
  try {
    const profile = await updateProfileService(req as any, req.body);
    res.json(profile);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
});
