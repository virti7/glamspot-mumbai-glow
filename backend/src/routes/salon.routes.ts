import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getSalons, getSalonById, getSalonServices, getSalonByOwnerId } from "../repositories/salon.repository";

export const salonRouter = Router();

salonRouter.get("/", async (req, res) => {
  try {
    const {
      locality,
      service,
      search,
      minPrice,
      maxPrice,
      minRating,
      limit,
      offset,
    } = req.query;

    const result = await getSalons({
      locality: locality as string | undefined,
      service: service as string | undefined,
      search: search as string | undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch salons" });
  }
});

salonRouter.get("/owner", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const salon = await getSalonByOwnerId(user.id);
    if (!salon) {
      res.status(404).json({ error: "No salon found for this owner" });
      return;
    }
    res.json(salon);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch salon" });
  }
});

salonRouter.get("/:id", async (req, res) => {
  try {
    const salon = await getSalonById(req.params.id);
    if (!salon) {
      res.status(404).json({ error: "Salon not found" });
      return;
    }
    res.json(salon);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch salon" });
  }
});

salonRouter.get("/:id/services", async (req, res) => {
  try {
    const services = await getSalonServices(req.params.id);
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch services" });
  }
});
