import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getSupabaseServerClient } from "../integrations/supabase/client";

export const salonManagementRouter = Router();

const ownerOrAdmin = requireRole("salon_owner", "admin");

async function getSalonId(userId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", userId)
    .single();
  return data?.id ?? null;
}

// ── CLAIMS ──
salonManagementRouter.post("/claims", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { salonId } = req.body;
    if (!salonId) { res.status(400).json({ error: "salonId is required" }); return; }
    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("salon_claims")
      .select("id, status")
      .eq("salon_id", salonId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (existing) { res.status(409).json({ error: `Claim already exists (${existing.status})` }); return; }
    const { data, error } = await supabase
      .from("salon_claims")
      .insert({ salon_id: salonId, owner_id: user.id })
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch { res.status(500).json({ error: "Failed to submit claim" }); }
});

salonManagementRouter.get("/claims", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name, slug, locality, city, address)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch claims" }); }
});

salonManagementRouter.get("/claims/pending", authMiddleware, requireRole(["admin"]), async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name, slug, locality, city, address, phone), owner:profiles(full_name, email, phone)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch pending claims" }); }
});

salonManagementRouter.put("/claims/:id/approve", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const admin = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data: claim } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name)")
      .eq("id", req.params.id)
      .single();
    if (!claim) { res.status(404).json({ error: "Claim not found" }); return; }
    if (claim.status !== "pending") { res.status(400).json({ error: "Claim already processed" }); return; }

    const { error: claimErr } = await supabase
      .from("salon_claims")
      .update({ status: "approved", admin_id: admin.id, updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (claimErr) { res.status(500).json({ error: claimErr.message }); return; }

    const { error: salonErr } = await supabase
      .from("salons")
      .update({ owner_id: claim.owner_id })
      .eq("id", claim.salon_id);
    if (salonErr) { res.status(500).json({ error: salonErr.message }); return; }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ role: "salon_owner" })
      .eq("id", claim.owner_id);
    if (profileErr) { res.status(500).json({ error: profileErr.message }); return; }

    res.json({ message: `Salon "${claim.salon.name}" approved and assigned` });
  } catch { res.status(500).json({ error: "Failed to approve claim" }); }
});

salonManagementRouter.put("/claims/:id/reject", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    const admin = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("salon_claims")
      .update({ status: "rejected", admin_id: admin.id, notes: req.body.notes || null, updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ message: "Claim rejected" });
  } catch { res.status(500).json({ error: "Failed to reject claim" }); }
});

// ── SEARCH SALONS (for claim flow) ──
salonManagementRouter.get("/search", authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("salons")
      .select("id, name, slug, locality, city, address, cover_image")
      .eq("is_active", true)
      .is("owner_id", null)
      .limit(10);
    if (q) query = query.or(`name.ilike.%${q}%,locality.ilike.%${q}%,address.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Search failed" }); }
});

// ── DASHBOARD STATS ──
salonManagementRouter.get("/stats", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.role === "admin" ? (req.query.salonId as string) || user.id : user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [bookings, todayBookings, monthBookings, reviews, customers] = await Promise.all([
      supabase.from("bookings").select("total_amount, status").eq("salon_id", salonId),
      supabase.from("bookings").select("id", { count: "exact" }).eq("salon_id", salonId).eq("booking_date", today),
      supabase.from("bookings").select("total_amount").eq("salon_id", salonId).gte("created_at", monthStart),
      supabase.from("reviews").select("rating").eq("salon_id", salonId),
      supabase.from("bookings").select("user_id").eq("salon_id", salonId).not("user_id", "is", null),
    ]);

    const totalRevenue = (bookings.data ?? []).reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const monthlyRevenue = (monthBookings.data ?? []).reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const avgRating = reviews.data?.length
      ? reviews.data.reduce((sum, r) => sum + r.rating, 0) / reviews.data.length
      : 0;
    const uniqueCustomers = new Set((customers.data ?? []).map((c: any) => c.user_id)).size;

    res.json({
      todayBookings: todayBookings.count ?? 0,
      totalRevenue,
      monthlyRevenue,
      totalBookings: bookings.data?.length ?? 0,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.data?.length ?? 0,
      totalCustomers: uniqueCustomers,
    });
  } catch { res.status(500).json({ error: "Failed to fetch stats" }); }
});

// ── CHARTS DATA ──
salonManagementRouter.get("/charts", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }

    const days = parseInt(req.query.days as string) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data: bookings } = await supabase
      .from("bookings")
      .select("booking_date, total_amount, status")
      .eq("salon_id", salonId)
      .gte("created_at", since)
      .order("booking_date", { ascending: true });

    const bookingsByDate = new Map<string, { bookings: number; revenue: number; completed: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      bookingsByDate.set(d, { bookings: 0, revenue: 0, completed: 0 });
    }
    for (const b of bookings ?? []) {
      const day = b.booking_date?.split("T")[0];
      if (day && bookingsByDate.has(day)) {
        const entry = bookingsByDate.get(day)!;
        entry.bookings++;
        entry.revenue += b.total_amount || 0;
        if (b.status === "completed") entry.completed++;
      }
    }

    const trend = Array.from(bookingsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    res.json({ trend });
  } catch { res.status(500).json({ error: "Failed to fetch charts" }); }
});

// ── SERVICES CRUD ──
salonManagementRouter.get("/services", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data, error } = await supabase
      .from("salon_services")
      .select("*")
      .eq("salon_id", salonId)
      .order("category", { ascending: true })
      .order("price", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch services" }); }
});

salonManagementRouter.post("/services", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { name, description, category, duration_minutes, price, discounted_price } = req.body;
    if (!name || !price) { res.status(400).json({ error: "Name and price are required" }); return; }
    const { data, error } = await supabase
      .from("salon_services")
      .insert({ salon_id: salonId, name, description, category, duration_minutes, price, discounted_price, is_active: true })
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch { res.status(500).json({ error: "Failed to create service" }); }
});

salonManagementRouter.put("/services/:id", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { name, description, category, duration_minutes, price, discounted_price, is_active } = req.body;
    const { data, error } = await supabase
      .from("salon_services")
      .update({ name, description, category, duration_minutes, price, discounted_price, is_active })
      .eq("id", req.params.id)
      .eq("salon_id", salonId)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update service" }); }
});

salonManagementRouter.delete("/services/:id", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { error } = await supabase
      .from("salon_services")
      .delete()
      .eq("id", req.params.id)
      .eq("salon_id", salonId);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ message: "Service deleted" });
  } catch { res.status(500).json({ error: "Failed to delete service" }); }
});

// ── STAFF CRUD ──
salonManagementRouter.get("/staff", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data, error } = await supabase
      .from("salon_staff")
      .select("*")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch staff" }); }
});

salonManagementRouter.post("/staff", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { name, role, experience, photo, specialization } = req.body;
    if (!name) { res.status(400).json({ error: "Name is required" }); return; }
    const { data, error } = await supabase
      .from("salon_staff")
      .insert({ salon_id: salonId, name, role, experience, photo, specialization })
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(data);
  } catch { res.status(500).json({ error: "Failed to add staff" }); }
});

salonManagementRouter.put("/staff/:id", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { name, role, experience, photo, specialization, is_active } = req.body;
    const { data, error } = await supabase
      .from("salon_staff")
      .update({ name, role, experience, photo, specialization, is_active })
      .eq("id", req.params.id)
      .eq("salon_id", salonId)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update staff" }); }
});

salonManagementRouter.delete("/staff/:id", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { error } = await supabase
      .from("salon_staff")
      .delete()
      .eq("id", req.params.id)
      .eq("salon_id", salonId);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ message: "Staff deleted" });
  } catch { res.status(500).json({ error: "Failed to delete staff" }); }
});

// ── BOOKINGS MANAGEMENT ──
salonManagementRouter.get("/bookings", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const status = req.query.status as string | undefined;
    let query = supabase
      .from("bookings")
      .select("*, user:profiles(full_name, phone, email), booking_services(*)")
      .eq("salon_id", salonId)
      .order("booking_date", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch bookings" }); }
});

salonManagementRouter.put("/bookings/:id/status", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { status } = req.body;
    const valid = ["confirmed", "cancelled", "completed"];
    if (!valid.includes(status)) { res.status(400).json({ error: `Invalid status: ${status}` }); return; }
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", req.params.id)
      .eq("salon_id", salonId)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update booking" }); }
});

// ── CUSTOMERS ──
salonManagementRouter.get("/customers", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data: bookings } = await supabase
      .from("bookings")
      .select("user_id, user:profiles(full_name, phone, email), booking_date, total_amount, status")
      .eq("salon_id", salonId)
      .not("user_id", "is", null)
      .order("booking_date", { ascending: false });
    const customerMap = new Map<string, any>();
    for (const b of bookings ?? []) {
      const uid = b.user_id;
      if (!customerMap.has(uid)) {
        customerMap.set(uid, {
          user_id: uid,
          name: b.user?.full_name || "Unknown",
          phone: b.user?.phone || "",
          email: b.user?.email || "",
          totalBookings: 0,
          totalSpent: 0,
          lastVisit: b.booking_date,
        });
      }
      const c = customerMap.get(uid)!;
      c.totalBookings++;
      c.totalSpent += b.total_amount || 0;
      if (b.booking_date > c.lastVisit) c.lastVisit = b.booking_date;
    }
    res.json(Array.from(customerMap.values()));
  } catch { res.status(500).json({ error: "Failed to fetch customers" }); }
});

// ── REVIEWS ──
salonManagementRouter.get("/reviews", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data, error } = await supabase
      .from("reviews")
      .select("*, user:profiles(full_name, avatar_url)")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch reviews" }); }
});

salonManagementRouter.post("/reviews/:id/reply", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { reply } = req.body;
    if (!reply) { res.status(400).json({ error: "Reply text is required" }); return; }
    const { data, error } = await supabase
      .from("reviews")
      .update({ owner_reply: reply })
      .eq("id", req.params.id)
      .eq("salon_id", salonId)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to reply to review" }); }
});

// ── SALON PROFILE ──
salonManagementRouter.put("/profile", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    if (!salon) { res.status(404).json({ error: "No salon found" }); return; }
    const { name, description, phone, address, locality, city, state, price_min, price_max, opening_time, closing_time, amenities, tags, cover_image, logo_image } = req.body;
    const { data, error } = await supabase
      .from("salons")
      .update({ name, description, phone, address, locality, city, state, price_min, price_max, opening_time, closing_time, amenities, tags, cover_image, logo_image, updated_at: new Date().toISOString() })
      .eq("id", salon.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update salon" }); }
});

// ── BUSINESS HOURS ──
salonManagementRouter.get("/hours", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data, error } = await supabase
      .from("salon_hours")
      .select("*")
      .eq("salon_id", salonId)
      .order("day_of_week", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch hours" }); }
});

salonManagementRouter.put("/hours", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { hours } = req.body;
    if (!Array.isArray(hours)) { res.status(400).json({ error: "hours array is required" }); return; }
    await supabase.from("salon_hours").delete().eq("salon_id", salonId);
    const records = hours.map((h: any) => ({
      salon_id: salonId,
      day_of_week: h.day_of_week,
      is_closed: h.is_closed || false,
      open_time: h.open_time || null,
      close_time: h.close_time || null,
    }));
    const { data, error } = await supabase.from("salon_hours").insert(records).select().order("day_of_week");
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update hours" }); }
});

// ── SET COVER IMAGE ──
salonManagementRouter.put("/gallery/:id/cover", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data: img } = await supabase
      .from("salon_images")
      .select("*")
      .eq("id", req.params.id)
      .eq("salon_id", salonId)
      .single();
    if (!img) { res.status(404).json({ error: "Image not found" }); return; }
    await supabase.from("salon_images").update({ is_primary: false }).eq("salon_id", salonId);
    await supabase.from("salon_images").update({ is_primary: true }).eq("id", req.params.id);
    const { data, error } = await supabase
      .from("salons")
      .update({ cover_image: img.image_url, updated_at: new Date().toISOString() })
      .eq("id", salonId)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to set cover image" }); }
});

// ── GALLERY UPLOAD (Image to Supabase Storage) ──
salonManagementRouter.post("/gallery", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { imageBase64, category } = req.body;
    if (!imageBase64) { res.status(400).json({ error: "Image data is required" }); return; }
    const matches = imageBase64.match(/^data:image\/(\w+);base64,/);
    if (!matches) { res.status(400).json({ error: "Invalid image format" }); return; }
    const ext = matches[1];
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const fileName = `${salonId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data: upload, error: uploadErr } = await supabase.storage
      .from("salon-images")
      .upload(fileName, buffer, { contentType: `image/${ext}`, upsert: false });
    if (uploadErr) { res.status(500).json({ error: uploadErr.message }); return; }
    const { data: { publicUrl } } = supabase.storage.from("salon-images").getPublicUrl(fileName);
    const { data: imageRecord, error: dbErr } = await supabase
      .from("salon_images")
      .insert({ salon_id: salonId, image_url: publicUrl, category: category || "Uncategorized" })
      .select()
      .single();
    if (dbErr) { res.status(500).json({ error: dbErr.message }); return; }
    res.status(201).json(imageRecord);
  } catch { res.status(500).json({ error: "Failed to upload image" }); }
});

salonManagementRouter.get("/gallery", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data, error } = await supabase
      .from("salon_images")
      .select("*")
      .eq("salon_id", salonId)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch gallery" }); }
});

salonManagementRouter.delete("/gallery/:id", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const salonId = await getSalonId(user.id);
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }
    const { data: img } = await supabase
      .from("salon_images")
      .select("image_url")
      .eq("id", req.params.id)
      .eq("salon_id", salonId)
      .single();
    if (!img) { res.status(404).json({ error: "Image not found" }); return; }
    const filePath = img.image_url.split("/salon-images/")[1];
    if (filePath) await supabase.storage.from("salon-images").remove([filePath]);
    await supabase.from("salon_images").delete().eq("id", req.params.id);
    res.json({ message: "Image deleted" });
  } catch { res.status(500).json({ error: "Failed to delete image" }); }
});

// ── OWNER SALON FULL PROFILE ──
salonManagementRouter.get("/profile", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data: salon } = await supabase
      .from("salons")
      .select("*, services:salon_services(*)")
      .eq("owner_id", user.id)
      .single();
    if (!salon) { res.status(404).json({ error: "No salon found" }); return; }
    res.json(salon);
  } catch { res.status(500).json({ error: "Failed to fetch salon" }); }
});
