import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getSupabaseServerClient } from "../integrations/supabase/client";

export const adminRouter = Router();
adminRouter.use(authMiddleware, requireRole("admin"));

// ── DASHBOARD ──
adminRouter.get("/dashboard", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [users, salons, bookings, claims, reviews, monthBookings, recentBookings, recentReviews, recentUsers, pendingClaimsList] = await Promise.all([
      supabase.from("profiles").select("id, role, created_at"),
      supabase.from("salons").select("id, name, slug, is_claimed, is_active, rating, city, cover_image, created_at, owner_id, owner:profiles(full_name)"),
      supabase.from("bookings").select("id, salon_id, total_amount, status, created_at, booking_date, booking_time, salon:salons(name), customer:profiles(full_name)"),
      supabase.from("salon_claims").select("id, status, created_at, salon:salons(name), owner:profiles(full_name, email)"),
      supabase.from("reviews").select("id, rating, comment, created_at, salon:salons(name), user:profiles(full_name)"),
      supabase.from("bookings").select("id, total_amount").gte("created_at", monthStart),
      supabase.from("bookings").select("id, salon_id, booking_date, booking_time, status, total_amount, created_at, salon:salons(name), customer:profiles(full_name)").order("created_at", { ascending: false }).limit(10),
      supabase.from("reviews").select("id, rating, comment, created_at, salon:salons(name), user:profiles(full_name)").order("created_at", { ascending: false }).limit(10),
      supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("salon_claims").select("*, salon:salons(name, slug), owner:profiles(full_name, email, phone)").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    ]);

    const roleCounts = { customer: 0, salon_owner: 0, admin: 0 };
    for (const p of users.data ?? []) {
      if (roleCounts[p.role as keyof typeof roleCounts] !== undefined) roleCounts[p.role as keyof typeof roleCounts]++;
    }

    const totalRevenue = (bookings.data ?? []).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const monthRevenue = (monthBookings.data ?? []).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const claimedSalons = (salons.data ?? []).filter((s: any) => s.is_claimed).length;
    const bookingsToday = (bookings.data ?? []).filter((b: any) => b.created_at?.startsWith(today)).length;
    const avgRating = reviews.data && reviews.data.length > 0
      ? (reviews.data.reduce((s: number, r: any) => s + r.rating, 0) / reviews.data.length).toFixed(1)
      : "0.0";

    const topSalons = (salons.data ?? [])
      .filter((s: any) => s.rating)
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, rating: s.rating, owner: s.owner?.full_name || null }));

    const mostBookedSalons: any[] = [];
    const bookingCounts = new Map<string, { count: number; name: string; slug: string }>();
    for (const b of bookings.data ?? []) {
      const sid = b.salon_id;
      if (!bookingCounts.has(sid)) {
        bookingCounts.set(sid, { count: 0, name: b.salon?.name || "Unknown", slug: b.salon?.slug || "" });
      }
      bookingCounts.get(sid)!.count++;
    }
    const sortedBookings = [...bookingCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    for (const [id, data] of sortedBookings) {
      mostBookedSalons.push({ id, name: data.name, slug: data.slug, bookings: data.count });
    }

    const lowestRatedSalons = (salons.data ?? [])
      .filter((s: any) => s.rating)
      .sort((a: any, b: any) => (a.rating || 0) - (b.rating || 0))
      .slice(0, 5)
      .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, rating: s.rating }));

    res.json({
      stats: {
        totalUsers: users.data?.length ?? 0,
        totalCustomers: roleCounts.customer,
        totalSalonOwners: roleCounts.salon_owner,
        totalSalons: salons.data?.length ?? 0,
        claimedSalons,
        pendingClaims: (claims.data ?? []).filter((c: any) => c.status === "pending").length,
        bookingsToday,
        bookingsThisMonth: monthBookings.data?.length ?? 0,
        totalRevenue,
        monthlyRevenue: monthRevenue,
        totalReviews: reviews.data?.length ?? 0,
        averageRating: avgRating,
      },
      recentBookings: (recentBookings.data ?? []).map((b: any) => ({
        id: b.id, salon: b.salon?.name, customer: b.customer?.full_name,
        date: b.booking_date, time: b.booking_time, status: b.status, amount: b.total_amount,
      })),
      recentReviews: (recentReviews.data ?? []).map((r: any) => ({
        id: r.id, salon: r.salon?.name, user: r.user?.full_name,
        rating: r.rating, comment: r.comment, date: r.created_at,
      })),
      recentUsers: (recentUsers.data ?? []).map((u: any) => ({
        id: u.id, name: u.full_name, email: u.email, role: u.role, date: u.created_at,
      })),
      pendingClaimsList: (pendingClaimsList.data ?? []).map((c: any) => ({
        id: c.id, salon: c.salon?.name, salonSlug: c.salon?.slug,
        owner: c.owner?.full_name, email: c.owner?.email, phone: c.owner?.phone, date: c.created_at,
      })),
      topSalons,
      mostBookedSalons,
      lowestRatedSalons,
    });
  } catch { res.status(500).json({ error: "Failed to fetch dashboard data" }); }
});

// ── STATS ──
adminRouter.get("/stats", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().slice(0, 10);
    const [users, salons, bookings, claims, reviews, todayBookings] = await Promise.all([
      supabase.from("profiles").select("id, role"),
      supabase.from("salons").select("id, is_claimed"),
      supabase.from("bookings").select("id, total_amount, status"),
      supabase.from("salon_claims").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("reviews").select("id", { count: "exact" }),
      supabase.from("bookings").select("id").gte("created_at", today),
    ]);
    const totalRevenue = (bookings.data ?? []).reduce((s, b: any) => s + (b.total_amount || 0), 0);
    const roleCounts = { customer: 0, salon_owner: 0, admin: 0 };
    for (const p of users.data ?? []) {
      if (roleCounts[p.role as keyof typeof roleCounts] !== undefined) roleCounts[p.role as keyof typeof roleCounts]++;
    }
    const claimedSalons = (salons.data ?? []).filter((s: any) => s.is_claimed).length;
    res.json({
      totalUsers: users.data?.length ?? 0,
      totalSalons: salons.data?.length ?? 0,
      totalBookings: bookings.count ?? 0,
      totalRevenue,
      pendingClaims: claims.count ?? 0,
      totalReviews: reviews.count ?? 0,
      bookingsToday: todayBookings.count ?? 0,
      claimedSalons,
      ...roleCounts,
    });
  } catch { res.status(500).json({ error: "Failed to fetch stats" }); }
});

// ── SALONS ──
adminRouter.get("/salons", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salons")
      .select("*, owner:profiles(full_name, email, id)")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    const salonsWithReviews = await Promise.all((data ?? []).map(async (salon: any) => {
      const { count } = await supabase.from("reviews").select("id", { count: "exact" }).eq("salon_id", salon.id);
      return { ...salon, reviewCount: count ?? 0 };
    }));
    res.json(salonsWithReviews);
  } catch { res.status(500).json({ error: "Failed to fetch salons" }); }
});

adminRouter.put("/salons/:id/status", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") { res.status(400).json({ error: "is_active (boolean) required" }); return; }
    const { data, error } = await supabase.from("salons").update({ is_active }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update salon" }); }
});

adminRouter.put("/salons/:id/assign-owner", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { owner_id } = req.body;
    if (!owner_id) { res.status(400).json({ error: "owner_id is required" }); return; }
    const { data, error } = await supabase.from("salons").update({ owner_id }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    await supabase.from("profiles").update({ role: "salon_owner" }).eq("id", owner_id);
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to assign owner" }); }
});

adminRouter.put("/salons/:id/feature", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { is_featured } = req.body;
    if (typeof is_featured !== "boolean") { res.status(400).json({ error: "is_featured (boolean) required" }); return; }
    const { data, error } = await supabase.from("salons").update({ is_featured, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update salon feature" }); }
});

adminRouter.delete("/salons/:id", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("salons").delete().eq("id", req.params.id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete salon" }); }
});

// ── USERS ──
adminRouter.get("/users", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch users" }); }
});

adminRouter.put("/users/:id/role", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { role } = req.body;
    if (!["customer", "salon_owner", "admin"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
    const { data, error } = await supabase.from("profiles").update({ role }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update role" }); }
});

adminRouter.put("/users/:id/status", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") { res.status(400).json({ error: "is_active (boolean) required" }); return; }
    const { data, error } = await supabase.from("profiles").update({ is_active }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update user status" }); }
});

// ── CLAIMS ──
adminRouter.get("/claims", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(id, name, slug, locality, city), owner:profiles(id, full_name, email, phone)")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch claims" }); }
});

adminRouter.put("/claims/:id/status", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) { res.status(400).json({ error: "status must be 'approved' or 'rejected'" }); return; }
    const { data: claim, error: claimError } = await supabase.from("salon_claims").select("*").eq("id", req.params.id).single();
    if (claimError || !claim) { res.status(404).json({ error: "Claim not found" }); return; }
    await supabase.from("salon_claims").update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id);
    if (status === "approved") {
      await supabase.from("salons").update({ owner_id: claim.owner_id, is_claimed: true, claimed_at: new Date().toISOString() }).eq("id", claim.salon_id);
      await supabase.from("profiles").update({ role: "salon_owner" }).eq("id", claim.owner_id);
    }
    res.json({ success: true, status });
  } catch { res.status(500).json({ error: "Failed to update claim" }); }
});

// ── BOOKINGS ──
adminRouter.get("/bookings", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, salon:salons(name, slug), customer:profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    const enriched = (data ?? []).map((b: any) => ({
      ...b, service_name: b.service_name || (b as any).service || "General",
    }));
    res.json(enriched);
  } catch { res.status(500).json({ error: "Failed to fetch bookings" }); }
});

adminRouter.put("/bookings/:id/status", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { status } = req.body;
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
    const { data, error } = await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update booking" }); }
});

// ── PAYMENTS ──
adminRouter.get("/payments", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*, user:profiles(full_name, email), salon:salons(name)")
      .order("created_at", { ascending: false });
    if (error && error.code !== "PGRST116") { res.status(500).json({ error: error.message }); return; }

    const bookings = await supabase.from("bookings").select("id, total_amount, status, created_at, salon:salons(name), customer:profiles(full_name, email)").order("created_at", { ascending: false });

    const paymentData = data ?? [];
    const bookingData = (bookings.data ?? []).filter((b: any) => b.status === "confirmed" || b.status === "completed");

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

    const dailyRevenue = bookingData.filter((b: any) => b.created_at?.startsWith(today)).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const monthlyRevenue = bookingData.filter((b: any) => b.created_at >= monthStart).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const yearlyRevenue = bookingData.filter((b: any) => b.created_at >= yearStart).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);

    res.json({
      payments: bookingData.map((b: any) => ({
        id: b.id, transaction_id: b.id.slice(0, 12).toUpperCase(),
        user: b.customer?.full_name, salon: b.salon?.name,
        amount: b.total_amount, status: b.status, date: b.created_at,
      })),
      analytics: { dailyRevenue, monthlyRevenue, yearlyRevenue },
    });
  } catch { res.status(500).json({ error: "Failed to fetch payments" }); }
});

// ── REVIEWS ──
adminRouter.get("/reviews", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*, salon:salons(name), user:profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch reviews" }); }
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("reviews").delete().eq("id", req.params.id);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Failed to delete review" }); }
});

adminRouter.put("/reviews/:id/hide", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { is_hidden } = req.body;
    if (typeof is_hidden !== "boolean") { res.status(400).json({ error: "is_hidden (boolean) required" }); return; }
    const { data, error } = await supabase.from("reviews").update({ is_hidden }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update review" }); }
});

adminRouter.put("/reviews/:id/flag", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { is_flagged } = req.body;
    if (typeof is_flagged !== "boolean") { res.status(400).json({ error: "is_flagged (boolean) required" }); return; }
    const { data, error } = await supabase.from("reviews").update({ is_flagged }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to flag review" }); }
});

// ── ANALYTICS ──
adminRouter.get("/analytics", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const period = (req.query.period as string) || "30d";
    const now = new Date();
    let startDate: Date, dateTrunc: string;
    switch (period) {
      case "today": startDate = new Date(now.toISOString().slice(0, 10)); dateTrunc = "hour"; break;
      case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); dateTrunc = "day"; break;
      case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); dateTrunc = "day"; break;
      case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); dateTrunc = "week"; break;
      case "1y": startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); dateTrunc = "month"; break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); dateTrunc = "day";
    }

    const startStr = startDate.toISOString();
    const [usersResult, salonsResult, bookingsResult, reviewsResult] = await Promise.all([
      supabase.from("profiles").select("id, created_at").gte("created_at", startStr),
      supabase.from("salons").select("id, created_at, is_claimed").gte("created_at", startStr),
      supabase.from("bookings").select("id, total_amount, status, created_at").gte("created_at", startStr),
      supabase.from("reviews").select("id, created_at").gte("created_at", startStr),
    ]);

    const aggregateByDate = (data: any[], field: string) => {
      const map = new Map<string, number>();
      for (const item of data ?? []) {
        const d = new Date(item[field]);
        let key: string;
        if (dateTrunc === "hour") key = d.toISOString().slice(0, 13);
        else if (dateTrunc === "day") key = d.toISOString().slice(0, 10);
        else if (dateTrunc === "week") {
          const w = new Date(d); w.setDate(d.getDate() - d.getDay());
          key = w.toISOString().slice(0, 10);
        } else key = d.toISOString().slice(0, 7);
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Object.fromEntries(map);
    };

    const revenueTrend: Record<string, number> = {};
    for (const b of bookingsResult.data ?? []) {
      const d = new Date(b.created_at);
      let key: string;
      if (dateTrunc === "hour") key = d.toISOString().slice(0, 13);
      else if (dateTrunc === "day") key = d.toISOString().slice(0, 10);
      else if (dateTrunc === "week") {
        const w = new Date(d); w.setDate(d.getDate() - d.getDay());
        key = w.toISOString().slice(0, 10);
      } else key = d.toISOString().slice(0, 7);
      revenueTrend[key] = (revenueTrend[key] || 0) + (b.total_amount || 0);
    }

    const confirmed = (bookingsResult.data ?? []).filter((b: any) => b.status === "confirmed" || b.status === "completed");

    res.json({
      period, users: { total: usersResult.data?.length ?? 0, trend: aggregateByDate(usersResult.data ?? [], "created_at") },
      salons: { total: salonsResult.data?.length ?? 0, claimed: (salonsResult.data ?? []).filter((s: any) => s.is_claimed).length, trend: aggregateByDate(salonsResult.data ?? [], "created_at") },
      bookings: { total: bookingsResult.data?.length ?? 0, revenue: confirmed.reduce((s: number, b: any) => s + (b.total_amount || 0), 0), trend: aggregateByDate(bookingsResult.data ?? [], "created_at"), revenueTrend, byStatus: { pending: (bookingsResult.data ?? []).filter((b: any) => b.status === "pending").length, confirmed: (bookingsResult.data ?? []).filter((b: any) => b.status === "confirmed").length, completed: (bookingsResult.data ?? []).filter((b: any) => b.status === "completed").length, cancelled: (bookingsResult.data ?? []).filter((b: any) => b.status === "cancelled").length } },
      reviews: { total: reviewsResult.data?.length ?? 0, trend: aggregateByDate(reviewsResult.data ?? [], "created_at") },
    });
  } catch { res.status(500).json({ error: "Failed to fetch analytics" }); }
});

// ── GLAM AI ──
adminRouter.get("/glam-ai", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [scans, todayScans, subscriptions] = await Promise.all([
      supabase.from("scans").select("id, created_at, is_premium"),
      supabase.from("scans").select("id").gte("created_at", today),
      supabase.from("subscriptions").select("id, plan_name, amount, created_at"),
    ]);

    const totalScans = scans.data?.length ?? 0;
    const todayScansCount = todayScans.count ?? 0;
    const premiumScans = (scans.data ?? []).filter((s: any) => s.is_premium).length;
    const premiumConversions = subscriptions.data?.length ?? 0;
    const revenueFromAI = (subscriptions.data ?? []).reduce((s: number, sub: any) => s + (sub.amount || 0), 0);

    const dailyUsage: Record<string, number> = {};
    const monthlyUsage: Record<string, number> = {};
    for (const s of scans.data ?? []) {
      const d = s.created_at?.slice(0, 10);
      if (d) { dailyUsage[d] = (dailyUsage[d] || 0) + 1; }
      const m = s.created_at?.slice(0, 7);
      if (m) { monthlyUsage[m] = (monthlyUsage[m] || 0) + 1; }
    }

    const subConversions: Record<string, number> = {};
    for (const sub of subscriptions.data ?? []) {
      const m = sub.created_at?.slice(0, 7);
      if (m) { subConversions[m] = (subConversions[m] || 0) + 1; }
    }

    res.json({
      totalScans, todayScans: todayScansCount, premiumScans,
      premiumConversions, revenueFromAI,
      charts: {
        dailyUsage, monthlyUsage, subConversions,
      },
    });
  } catch { res.status(500).json({ error: "Failed to fetch Glam AI data" }); }
});

// ── NOTIFICATIONS ──
adminRouter.get("/notifications", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const [pendingClaims, newSalons, newReviews, newBookings, newUsers] = await Promise.all([
      supabase.from("salon_claims").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("salons").select("id", { count: "exact" }).gte("created_at", sevenDaysAgo),
      supabase.from("reviews").select("id", { count: "exact" }).gte("created_at", sevenDaysAgo),
      supabase.from("bookings").select("id", { count: "exact" }).gte("created_at", today),
      supabase.from("profiles").select("id", { count: "exact" }).gte("created_at", sevenDaysAgo),
    ]);

    res.json({
      pendingClaims: pendingClaims.count ?? 0,
      newSalons: newSalons.count ?? 0,
      newReviews: newReviews.count ?? 0,
      newBookings: newBookings.count ?? 0,
      newUsers: newUsers.count ?? 0,
    });
  } catch { res.status(500).json({ error: "Failed to fetch notifications" }); }
});

// ── SETTINGS ──
adminRouter.get("/settings", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("platform_settings").select("*").single();
    if (error && error.code !== "PGRST116") { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? {});
  } catch { res.status(500).json({ error: "Failed to fetch settings" }); }
});

adminRouter.put("/settings", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("platform_settings").upsert({ id: 1, ...req.body, updated_at: new Date().toISOString() }).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to update settings" }); }
});

// ── COVER IMAGE ──
adminRouter.put("/salons/:id/cover", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { image_url } = req.body;
    if (!image_url) { res.status(400).json({ error: "image_url is required" }); return; }
    await supabase.from("salon_images").update({ is_primary: false }).eq("salon_id", req.params.id);
    await supabase.from("salon_images").update({ is_primary: true }).eq("salon_id", req.params.id).eq("image_url", image_url);
    const { data, error } = await supabase.from("salons").update({ cover_image: image_url, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to set cover image" }); }
});
