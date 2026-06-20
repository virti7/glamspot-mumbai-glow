import { Router } from "express";
import { signUpService, signInService, getSessionService } from "../services/auth.service";
import { getUserFromToken } from "../integrations/supabase/auth";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: "Email, password, and full name are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const result = await signUpService(email, password, fullName, phone);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.status || 400).json({ error: error.message || "Failed to sign up" });
  }
});

authRouter.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await signInService(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 401).json({ error: error.message || "Invalid email or password" });
  }
});

authRouter.post("/signout", async (_req, res) => {
  res.json({ message: "Signed out successfully" });
});

authRouter.get("/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No session token provided" });
      return;
    }

    const token = authHeader.slice(7);
    const user = await getUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const result = await getSessionService(token);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 401).json({ error: error.message || "Session invalid" });
  }
});
