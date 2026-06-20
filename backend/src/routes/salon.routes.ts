import { Router } from "express";

export const salonRouter = Router();

salonRouter.get("/", async (req, res) => {
  res.json({ message: "Get all salons" });
});

salonRouter.get("/:id", async (req, res) => {
  res.json({ message: `Get salon ${req.params.id}` });
});

salonRouter.get("/:id/services", async (req, res) => {
  res.json({ message: `Get services for salon ${req.params.id}` });
});
