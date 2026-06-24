import { Router } from "express";
import { signUpService, signInService, getSessionService } from "../services/auth.service";
import { getUserFromToken } from "../integrations/supabase/auth";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;

    console.log("[POST /signup] Request received", { email, fullName, role });

    if (!email || !password || !fullName) {
      res.status(400).json({ error: "Email, password, and full name are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const validRole = role === "salon_owner" ? "salon_owner" : "customer";
    const result = await signUpService(email, password, fullName, phone, validRole);
    console.log("[POST /signup] Success for", email);
    res.status(201).json(result);
  } catch (error: any) {
    const status = error?.status ?? 400;
    const message = error?.message ?? (typeof error === "string" ? error : "Failed to sign up");
    console.error("[POST /signup] Error:", error);
    res.status(status).json({ error: message });
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
    const status = error?.status ?? 401;
    const message = error?.message ?? (typeof error === "string" ? error : "Invalid email or password");
    console.error("[POST /signin] Error:", error);
    res.status(status).json({ error: message });
  }
});

authRouter.post("/admin-signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const result = await signInService(email, password);
    if (result.profile.role !== "admin") {
      res.status(403).json({ error: "Access Denied. Admin privileges required." });
      return;
    }
    res.json(result);
  } catch (error: any) {
    const status = error?.status ?? 401;
    const message = error?.message ?? (typeof error === "string" ? error : "Invalid email or password");
    console.error("[POST /admin-signin] Error:", error);
    res.status(status).json({ error: message });
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
    const status = error?.status ?? 401;
    const message = error?.message ?? (typeof error === "string" ? error : "Session invalid");
    console.error("[GET /session] Error:", error);
    res.status(status).json({ error: message });
  }
});
