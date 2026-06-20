import { Router } from "express";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  res.json({ message: "Login endpoint - implement with Supabase Auth" });
});

authRouter.post("/register", async (req, res) => {
  res.json({ message: "Register endpoint - implement with Supabase Auth" });
});

authRouter.post("/logout", async (req, res) => {
  res.json({ message: "Logout endpoint" });
});

authRouter.get("/session", async (req, res) => {
  res.json({ message: "Session endpoint - implement with Supabase Auth" });
});
