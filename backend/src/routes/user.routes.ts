import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getProfileService, updateProfileService } from "../services/user.service";
import { getUserSubscription, checkScanLimit } from "../repositories/subscription.repository";
import { getSupabaseServerClient } from "../integrations/supabase/client";

export const userRouter = Router();

userRouter.get("/profile", authMiddleware, async (req, res) => {
  try {
    const profile = await getProfileService(req as any);
    res.json(profile);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to fetch profile" });
  }
});

userRouter.put("/profile", authMiddleware, async (req, res) => {
  try {
    const profile = await updateProfileService(req as any, req.body);
    res.json(profile);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message || "Failed to update profile" });
  }
});

userRouter.get("/subscription", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = await getUserSubscription(user.id);
    res.json(subscription);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch subscription" });
  }
});

userRouter.get("/scan-quota", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const quota = await checkScanLimit(user.id);
    res.json(quota);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to check scan quota" });
  }
});

userRouter.get("/bookings", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, salon:salons(name, locality, cover_image)")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
      return;
    }

    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

userRouter.get("/favorites", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("favorite_salons")
      .select("*, salon:salons(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to fetch favorites" });
      return;
    }

    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

userRouter.post("/favorites", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { salonId } = req.body;
    if (!salonId) {
      res.status(400).json({ error: "salonId is required" });
      return;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("favorite_salons")
      .upsert({ user_id: user.id, salon_id: salonId }, { onConflict: "user_id,salon_id" })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to add favorite" });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

userRouter.delete("/favorites/:salonId", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("favorite_salons")
      .delete()
      .eq("user_id", user.id)
      .eq("salon_id", req.params.salonId);

    if (error) {
      res.status(500).json({ error: "Failed to remove favorite" });
      return;
    }

    res.json({ message: "Favorite removed" });
  } catch {
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

userRouter.get("/stats", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();

    const [bookingsResult, favoritesResult, scansResult, subResult] = await Promise.all([
      supabase.from("bookings").select("status", { count: "exact" }).eq("user_id", user.id),
      supabase.from("favorite_salons").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("glam_scans").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("user_scan_quota").select("*").eq("user_id", user.id).single(),
    ]);

    const allBookings = bookingsResult.data ?? [];
    const completed = allBookings.filter(b => b.status === "completed").length;
    const upcoming = allBookings.filter(b => b.status === "confirmed" || b.status === "pending").length;

    res.json({
      totalBookings: bookingsResult.count ?? 0,
      completedBookings: completed,
      upcomingBookings: upcoming,
      favoriteSalons: favoritesResult.count ?? 0,
      glamScansUsed: subResult.data?.scans_used ?? 0,
      glamScansRemaining: subResult.data?.scans_remaining ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
