import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getSupabaseServerClient } from "../integrations/supabase/client";
import { sendClaimApproved, sendClaimRejected, sendOwnershipTransfer, sendOwnershipRemoved } from "../services/email.service";

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
      supabase.from("bookings").select("id, salon_id, total_amount, status, created_at, booking_date, start_time, salon:salons(name), user:profiles(full_name)"),
      supabase.from("salon_claims").select("id, status, created_at, salon_name"),
      supabase.from("reviews").select("id, rating, comment, created_at, salon:salons(name), user:profiles(full_name)"),
      supabase.from("bookings").select("id, total_amount").gte("created_at", monthStart),
      supabase.from("bookings").select("id, salon_id, booking_date, start_time, status, total_amount, created_at, salon:salons(name), user:profiles(full_name)").order("created_at", { ascending: false }).limit(10),
      supabase.from("reviews").select("id, rating, comment, created_at, salon:salons(name), user:profiles(full_name)").order("created_at", { ascending: false }).limit(10),
      supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("salon_claims").select("*, salon:salons(name, slug)").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    ]);

    const roleCounts = { customer: 0, salon_owner: 0, admin: 0 };
    for (const p of users.data ?? []) {
      if (roleCounts[p.role as keyof typeof roleCounts] !== undefined) roleCounts[p.role as keyof typeof roleCounts]++;
    }

    const totalRevenue = (bookings.data ?? []).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const monthRevenue = (monthBookings.data ?? []).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const claimedSalons = (salons.data ?? []).filter((s: any) => s.is_claimed).length;
    const unclaimedSalons = (salons.data ?? []).filter((s: any) => !s.is_claimed).length;
    const activeOwners = new Set((salons.data ?? []).filter((s: any) => s.owner_id).map((s: any) => s.owner_id)).size;
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
        unclaimedSalons,
        activeOwners,
        pendingClaims: (claims.data ?? []).filter((c: any) => c.status === "pending").length,
        bookingsToday,
        bookingsThisMonth: monthBookings.data?.length ?? 0,
        totalRevenue,
        monthlyRevenue: monthRevenue,
        totalReviews: reviews.data?.length ?? 0,
        averageRating: avgRating,
      },
      recentBookings: (recentBookings.data ?? []).map((b: any) => ({
        id: b.id, salon: b.salon?.name, customer: b.user?.full_name,
        date: b.booking_date, time: b.start_time, status: b.status, amount: b.total_amount,
      })),
      recentReviews: (recentReviews.data ?? []).map((r: any) => ({
        id: r.id, salon: r.salon?.name, user: r.user?.full_name,
        rating: r.rating, comment: r.comment, date: r.created_at,
      })),
      recentUsers: (recentUsers.data ?? []).map((u: any) => ({
        id: u.id, name: u.full_name, email: u.email, role: u.role, date: u.created_at,
      })),
      pendingClaimsList: (pendingClaimsList.data ?? []).map((c: any) => ({
        id: c.id, salon: c.salon_name || c.salon?.name, salonSlug: c.salon?.slug,
        owner: c.full_name, email: c.email, phone: c.phone, date: c.created_at,
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
      .select("*, salon:salons(id, name, slug, locality, city)")
      .order("created_at", { ascending: false });
    if (error) {
      console.log("Admin claims fetch error:", error.message);
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (err) {
    console.log("Admin claims fetch unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch claims" });
  }
});

adminRouter.put("/claims/:id/status", async (req, res) => {
  try {
    const admin = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) { res.status(400).json({ error: "status must be 'approved' or 'rejected'" }); return; }

    const { data: claim, error: claimError } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name)")
      .eq("id", req.params.id)
      .single();

    if (claimError || !claim) {
      console.log("Claim not found:", req.params.id);
      res.status(404).json({ error: "Claim not found" });
      return;
    }

    const salonName = claim.salon_name || claim.salon?.name || "Salon";
    const ownerName = claim.full_name || "Owner";
    const ownerEmail = claim.email || "";

    console.log(`Processing claim ${req.params.id}: ${status} for salon "${salonName}"`);

    const now = new Date().toISOString();
    const updateFields: Record<string, any> = { status, updated_at: now };
    if (status === "approved") {
      updateFields.approved_by = admin.id;
      updateFields.approved_at = now;
    } else {
      updateFields.rejected_by = admin.id;
      updateFields.rejected_at = now;
    }
    const { error: updateErr } = await supabase
      .from("salon_claims")
      .update(updateFields)
      .eq("id", req.params.id);

    if (updateErr) {
      console.log("Claim status update failed:", updateErr.message);
      res.status(500).json({ error: updateErr.message });
      return;
    }

    if (status === "approved") {
      const { error: salonErr } = await supabase
        .from("salons")
        .update({ owner_id: claim.user_id, is_claimed: true, claimed_at: now })
        .eq("id", claim.salon_id);
      if (salonErr) console.log("Salon update error:", salonErr.message);

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ role: "salon_owner" })
        .eq("id", claim.user_id);
      if (profileErr) console.log("Profile update error:", profileErr.message);

      await supabase.from("salon_owner_history").insert({
        salon_id: claim.salon_id,
        old_owner_id: null,
        new_owner_id: claim.user_id,
        action: "claim",
        performed_by_admin_id: admin.id,
      });

      await supabase
        .from("salon_claims")
        .update({ status: "rejected", rejected_by: admin.id, rejected_at: now, updated_at: now })
        .eq("salon_id", claim.salon_id)
        .neq("id", req.params.id)
        .eq("status", "pending");

      console.log(`Claim ${req.params.id} approved. Salon ${salonName} assigned to ${ownerName}`);

      try {
        sendClaimApproved({ email: ownerEmail, salonName, ownerName });
      } catch (emailErr) {
        console.log("Approval email skipped:", emailErr);
      }
    } else {
      console.log(`Claim ${req.params.id} rejected`);

      try {
        sendClaimRejected({ email: ownerEmail, salonName, ownerName });
      } catch (emailErr) {
        console.log("Rejection email skipped:", emailErr);
      }
    }

    res.json({ success: true, status });
  } catch (err) {
    console.log("Failed to update claim:", err);
    res.status(500).json({ error: "Failed to update claim" });
  }
});

// ── SALON OWNERS ──
adminRouter.get("/salon-owners", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salons")
      .select("id, name, slug, is_claimed, claimed_at, owner_id, owner:profiles(id, full_name, email, phone, role)")
      .not("owner_id", "is", null)
      .order("name", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch salon owners" }); }
});

adminRouter.get("/salon-owners/:salonId", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data: salon, error } = await supabase
      .from("salons")
      .select("*, owner:profiles(id, full_name, email, phone, role)")
      .eq("id", req.params.salonId)
      .single();
    if (error || !salon) { res.status(404).json({ error: "Salon not found" }); return; }
    const { data: history } = await supabase
      .from("salon_owner_history")
      .select("*, performed_by:profiles(full_name)")
      .eq("salon_id", req.params.salonId)
      .order("created_at", { ascending: false });
    res.json({ salon, history: history ?? [] });
  } catch { res.status(500).json({ error: "Failed to fetch salon owner details" }); }
});

adminRouter.post("/salon-owners/transfer", async (req, res) => {
  try {
    const admin = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { salon_id, new_owner_id } = req.body;
    if (!salon_id || !new_owner_id) { res.status(400).json({ error: "salon_id and new_owner_id are required" }); return; }

    const { data: salon } = await supabase.from("salons").select("id, name, owner_id, is_claimed").eq("id", salon_id).single();
    if (!salon) { res.status(404).json({ error: "Salon not found" }); return; }

    const oldOwnerId = salon.owner_id;

    const { data: newOwner } = await supabase.from("profiles").select("id, full_name, email, role").eq("id", new_owner_id).single();
    if (!newOwner) { res.status(404).json({ error: "New owner not found" }); return; }

    const { data: oldOwner } = await supabase.from("profiles").select("id, full_name, email").eq("id", oldOwnerId).maybeSingle();

    const { error: updateErr } = await supabase
      .from("salons")
      .update({ owner_id: new_owner_id, is_claimed: true, claimed_at: new Date().toISOString() })
      .eq("id", salon_id);
    if (updateErr) { res.status(500).json({ error: updateErr.message }); return; }

    if (newOwner.role !== "salon_owner") {
      await supabase.from("profiles").update({ role: "salon_owner" }).eq("id", new_owner_id);
    }

    await supabase.from("salon_owner_history").insert({
      salon_id,
      old_owner_id: oldOwnerId,
      new_owner_id,
      action: "transfer",
      performed_by_admin_id: admin.id,
    });

    sendOwnershipTransfer({
      newOwnerEmail: newOwner.email,
      newOwnerName: newOwner.full_name,
      salonName: salon.name,
      oldOwnerName: oldOwner?.full_name || "Unknown",
    });

    res.json({ message: `Ownership transferred to ${newOwner.full_name}` });
  } catch { res.status(500).json({ error: "Failed to transfer ownership" }); }
});

adminRouter.post("/salon-owners/remove", async (req, res) => {
  try {
    const admin = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { salon_id } = req.body;
    if (!salon_id) { res.status(400).json({ error: "salon_id is required" }); return; }

    const { data: salon } = await supabase.from("salons").select("id, name, owner_id, is_claimed").eq("id", salon_id).single();
    if (!salon) { res.status(404).json({ error: "Salon not found" }); return; }
    if (!salon.owner_id) { res.status(400).json({ error: "Salon has no owner" }); return; }

    const { data: oldOwner } = await supabase.from("profiles").select("id, full_name, email").eq("id", salon.owner_id).single();
    const removedOwnerName = oldOwner?.full_name || "Unknown";
    const removedOwnerEmail = oldOwner?.email || "";

    await supabase.from("salons").update({ owner_id: null, is_claimed: false, claimed_at: null }).eq("id", salon_id);

    await supabase.from("salon_owner_history").insert({
      salon_id,
      old_owner_id: salon.owner_id,
      new_owner_id: null,
      action: "remove",
      performed_by_admin_id: admin.id,
    });

    sendOwnershipRemoved({
      salonName: salon.name,
      previousOwnerName: removedOwnerName,
      previousOwnerEmail: removedOwnerEmail,
    });

    res.json({ message: `Ownership removed from ${removedOwnerName}. Salon is now unclaimed.` });
  } catch { res.status(500).json({ error: "Failed to remove ownership" }); }
});

adminRouter.get("/ownership-history", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_owner_history")
      .select("*, salon:salons(name), old_owner:profiles!old_owner_id(full_name), new_owner:profiles!new_owner_id(full_name), performed_by:profiles!performed_by_admin_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch ownership history" }); }
});

// ── BOOKINGS ──

const BOOKING_SELECT = "*, salon:salons!salon_id(id, name, slug, locality, city, cover_image, phone, owner_id), user:profiles!user_id(full_name, email, phone), booking_services(*), payment:payments(*), staff:salon_staff!staff_id(id, name, role, avatar_url)";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "completed", "cancelled"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

adminRouter.get("/bookings/stats", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const isRevenueBooking = (b: any) => {
      const src = (b.booking_source || "").toLowerCase();
      const ps = (b.payment_status || "").toLowerCase();
      const st = (b.status || "").toLowerCase();
      const isPlatform = src === "website" || src === "glamspot";
      const isPaid = ps === "paid" || ps === "completed";
      const isActive = st !== "cancelled" && st !== "no_show" && st !== "refunded";
      return isPlatform && isPaid && isActive;
    };

    const [rawBookings, rawPayments] = await Promise.all([
      supabase.from("bookings").select("id, status, booking_date, created_at, total_amount, booking_source, payment_status, updated_at, salon:salons!salon_id(id, name), user:profiles!user_id(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("payments").select("id, amount, status, refund_amount, created_at, payment_method, booking_id"),
    ]);

    let allBookings: any[] = rawBookings.data ?? [];
    if (rawBookings.error) {
      console.error("[Admin] Stats bookings query error:", JSON.stringify(rawBookings.error));
      const basic = await supabase.from("bookings").select("id, status, booking_date, created_at, total_amount, booking_source, payment_status, updated_at").order("created_at", { ascending: false });
      if (basic.error) {
        console.error("[Admin] Stats basic query error:", JSON.stringify(basic.error));
        res.status(500).json({ error: basic.error.message });
        return;
      }
      allBookings = basic.data ?? [];
    }
    const allPayments: any[] = rawPayments.data ?? [];
    if (rawPayments.error) {
      console.error("[Admin] Stats payments query error:", JSON.stringify(rawPayments.error));
    }

    const totalCount = allBookings.length;

    const todayBookings = allBookings.filter((b: any) => b.created_at?.startsWith(today)).length;
    const pendingBookings = allBookings.filter((b: any) => b.status === "pending").length;
    const confirmedBookings = allBookings.filter((b: any) => b.status === "confirmed").length;
    const completedBookings = allBookings.filter((b: any) => b.status === "completed").length;
    const cancelledBookings = allBookings.filter((b: any) => b.status === "cancelled").length;
    const checkedInBookings = allBookings.filter((b: any) => b.status === "checked_in").length;
    const inProgressBookings = allBookings.filter((b: any) => b.status === "in_progress").length;
    const noShowBookings = allBookings.filter((b: any) => b.status === "no_show").length;

    const upcomingBookings = allBookings.filter((b: any) => {
      const bd = b.booking_date;
      return bd && bd >= today && b.status !== "cancelled" && b.status !== "completed" && b.status !== "no_show";
    }).length;

    const revenueBookings = allBookings.filter(isRevenueBooking);
    const totalRevenue = revenueBookings.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const todayRevenue = revenueBookings.filter((b: any) => b.created_at?.startsWith(today)).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const weekRevenue = revenueBookings.filter((b: any) => b.created_at >= weekStart).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const monthRevenue = revenueBookings.filter((b: any) => b.created_at >= monthStart).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const yearRevenue = revenueBookings.filter((b: any) => b.created_at >= yearStart).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const averageBookingValue = totalCount > 0 ? +(totalRevenue / totalCount).toFixed(2) : 0;

    const paidPayments = allPayments.filter((p: any) => p.status === "completed" || p.status === "paid");
    const refundedPayments = allPayments.filter((p: any) => p.status === "refunded");
    const pendingPayments = allPayments.filter((p: any) => p.status === "pending");
    const failedPayments = allPayments.filter((p: any) => p.status === "failed");
    const totalPlatformFees = revenueBookings.reduce((s: number, b: any) => s + (b.platform_fee || 0), 0);
    const totalRefundAmount = refundedPayments.reduce((s: number, p: any) => s + (p.refund_amount || p.amount || 0), 0);
    const totalPendingAmount = pendingPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);

    const uniqueCustomers = new Set(allBookings.map((b: any) => b.user_id)).size;
    const uniqueSalons = new Set(allBookings.map((b: any) => b.salon_id)).size;
    const customerBookingMap = new Map<string, number>();
    allBookings.forEach((b: any) => { if (b.user_id) customerBookingMap.set(b.user_id, (customerBookingMap.get(b.user_id) || 0) + 1); });
    const returningCustomers = [...customerBookingMap.values()].filter(c => c > 1).length;
    const newCustomers = uniqueCustomers - returningCustomers;
    const averageRevenuePerSalon = uniqueSalons > 0 ? +(totalRevenue / uniqueSalons).toFixed(2) : 0;
    const averageRevenuePerCustomer = uniqueCustomers > 0 ? +(totalRevenue / uniqueCustomers).toFixed(2) : 0;
    const paymentSuccessRate = paidPayments.length + failedPayments.length > 0 ? +((paidPayments.length / (paidPayments.length + failedPayments.length)) * 100).toFixed(1) : 0;
    const paymentFailureRate = 100 - paymentSuccessRate;

    res.json({
      totalBookings: totalCount,
      todayBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      confirmedBookings,
      checkedInBookings,
      inProgressBookings,
      noShowBookings,
      totalRevenue,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      platformFees: totalPlatformFees,
      averageBookingValue,
      averageRevenuePerSalon,
      averageRevenuePerCustomer,
      refundAmount: totalRefundAmount,
      pendingPaymentAmount: totalPendingAmount,
      completedPayments: paidPayments.length,
      cancelledPayments: cancelledBookings,
      refundedPayments: refundedPayments.length,
      paymentSuccessRate,
      paymentFailureRate,
      uniqueCustomers,
      uniqueSalons,
      returningCustomers,
      newCustomers,
      averageRating: 0,
    });
  } catch (err) { console.error("[Admin] Booking stats error:", err); res.status(500).json({ error: "Failed to fetch booking stats" }); }
});

adminRouter.get("/bookings/analytics", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const period = (req.query.period as string) || "30d";
    const now = new Date();
    let startDate: Date;
    let dateTrunc: string;
    switch (period) {
      case "today": startDate = new Date(now.toISOString().slice(0, 10)); dateTrunc = "hour"; break;
      case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); dateTrunc = "day"; break;
      case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); dateTrunc = "day"; break;
      case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); dateTrunc = "week"; break;
      case "1y": startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); dateTrunc = "month"; break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); dateTrunc = "day";
    }
    const startStr = startDate.toISOString();

    const isRevenueBooking = (b: any) => {
      const src = (b.booking_source || "").toLowerCase();
      const ps = (b.payment_status || "").toLowerCase();
      const st = (b.status || "").toLowerCase();
      return (src === "website" || src === "glamspot") && (ps === "paid" || ps === "completed") && st !== "cancelled" && st !== "no_show" && st !== "refunded";
    };

    const [bookingsRes, paymentsRes, usersRes, salonsRes, reviewsRes] = await Promise.all([
      supabase.from("bookings").select("id, total_amount, status, created_at, booking_source, payment_status, salon_id, user_id, subtotal, platform_fee, discount_amount, tax_amount, booking_services(service_name, price)").gte("created_at", startStr),
      supabase.from("payments").select("id, amount, status, refund_amount, payment_method, created_at").gte("created_at", startStr),
      supabase.from("profiles").select("id, created_at").gte("created_at", startStr),
      supabase.from("salons").select("id, name, created_at").gte("created_at", startStr),
      supabase.from("reviews").select("id, rating, created_at").gte("created_at", startStr),
    ]);

    if (bookingsRes.error) console.error("[Admin] Analytics bookings error:", JSON.stringify(bookingsRes.error));

    const allBookings = bookingsRes.data ?? [];
    const allPayments = paymentsRes.data ?? [];

    const truncKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (dateTrunc === "hour") return d.toISOString().slice(0, 13);
      if (dateTrunc === "day") return d.toISOString().slice(0, 10);
      if (dateTrunc === "week") { const w = new Date(d); w.setDate(d.getDate() - d.getDay()); return w.toISOString().slice(0, 10); }
      return d.toISOString().slice(0, 7);
    };

    const countByDate = (items: any[]) => {
      const map: Record<string, number> = {};
      for (const item of items) { const k = truncKey(item.created_at); map[k] = (map[k] || 0) + 1; }
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
    };

    const revenueByDate = (items: any[]) => {
      const map: Record<string, number> = {};
      for (const item of items) {
        if (!isRevenueBooking(item)) continue;
        const k = truncKey(item.created_at);
        map[k] = (map[k] || 0) + (item.total_amount || 0);
      }
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: +value.toFixed(2) }));
    };

    const bookingsByStatus: Record<string, number> = {};
    allBookings.forEach((b: any) => { bookingsByStatus[b.status] = (bookingsByStatus[b.status] || 0) + 1; });

    const bookingsBySource: Record<string, number> = {};
    allBookings.forEach((b: any) => { const src = b.booking_source || "unknown"; bookingsBySource[src] = (bookingsBySource[src] || 0) + 1; });

    const paymentsByMethod: Record<string, number> = {};
    allPayments.forEach((p: any) => { const m = p.payment_method || "unknown"; paymentsByMethod[m] = (paymentsByMethod[m] || 0) + 1; });

    const paymentsByStatus: Record<string, number> = {};
    allPayments.forEach((p: any) => { paymentsByStatus[p.status] = (paymentsByStatus[p.status] || 0) + 1; });

    const serviceMap: Record<string, number> = {};
    allBookings.forEach((b: any) => {
      (b.booking_services || []).forEach((s: any) => { serviceMap[s.service_name] = (serviceMap[s.service_name] || 0) + 1; });
    });
    const topServices = Object.entries(serviceMap).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, count]) => ({ name, count }));

    const salonMap: Record<string, { name: string; count: number; revenue: number }> = {};
    allBookings.forEach((b: any) => {
      if (!b.salon_id) return;
      if (!salonMap[b.salon_id]) salonMap[b.salon_id] = { name: b.salon_id, count: 0, revenue: 0 };
      salonMap[b.salon_id].count++;
      if (isRevenueBooking(b)) salonMap[b.salon_id].revenue += b.total_amount || 0;
    });
    const topSalons = Object.entries(salonMap).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 10).map(([id, d]) => ({ salon_id: id, name: d.name, bookings: d.count, revenue: +d.revenue.toFixed(2) }));

    const totalRevenue = allBookings.filter(isRevenueBooking).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const totalPlatformFees = allBookings.filter(isRevenueBooking).reduce((s: number, b: any) => s + (b.platform_fee || 0), 0);
    const totalRefunds = allPayments.filter((p: any) => p.status === "refunded").reduce((s: number, p: any) => s + (p.refund_amount || p.amount || 0), 0);

    const platformFeeByDate = (() => {
      const map: Record<string, number> = {};
      allBookings.forEach((b: any) => {
        if (!isRevenueBooking(b)) return;
        const k = truncKey(b.created_at);
        map[k] = (map[k] || 0) + (b.platform_fee || 0);
      });
      return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: +value.toFixed(2) }));
    })();

    const customerBookingMap = new Map<string, number>();
    allBookings.forEach((b: any) => { if (b.user_id) customerBookingMap.set(b.user_id, (customerBookingMap.get(b.user_id) || 0) + 1); });
    const repeatCustomers = [...customerBookingMap.values()].filter(c => c > 1).length;
    const newCustomers = customerBookingMap.size - repeatCustomers;

    const cancellationRate = allBookings.length > 0 ? +(((bookingsByStatus["cancelled"] || 0) / allBookings.length) * 100).toFixed(1) : 0;
    const refundRate = allPayments.length > 0 ? +((allPayments.filter((p: any) => p.status === "refunded").length / allPayments.length) * 100).toFixed(1) : 0;

    const peakHours: Record<string, number> = {};
    allBookings.forEach((b: any) => {
      if (b.start_time) {
        const hour = String(b.start_time).slice(0, 2);
        peakHours[hour] = (peakHours[hour] || 0) + 1;
      }
    });
    const peakDays: Record<string, number> = {};
    allBookings.forEach((b: any) => {
      if (b.booking_date) {
        const day = new Date(b.booking_date).toLocaleDateString("en-US", { weekday: "short" });
        peakDays[day] = (peakDays[day] || 0) + 1;
      }
    });

    const durationMinutes: number[] = [];
    allBookings.forEach((b: any) => {
      const svcs = b.booking_services || [];
      svcs.forEach((s: any) => {
        if (s.duration_minutes) durationMinutes.push(s.duration_minutes);
      });
    });
    const avgDuration = durationMinutes.length > 0 ? Math.round(durationMinutes.reduce((a, b) => a + b, 0) / durationMinutes.length) : 0;
    const avgBookingValue = allBookings.length > 0 ? +(totalRevenue / allBookings.filter(isRevenueBooking).length || 0).toFixed(2) : 0;

    res.json({
      period,
      overview: {
        totalBookings: allBookings.length,
        totalRevenue: +totalRevenue.toFixed(2),
        totalPlatformFees: +totalPlatformFees.toFixed(2),
        totalRefunds: +totalRefunds.toFixed(2),
        averageBookingValue: avgBookingValue,
        averageDuration: avgDuration,
        paymentSuccessRate: allPayments.length > 0 ? +((allPayments.filter((p: any) => p.status === "completed" || p.status === "paid").length / allPayments.length) * 100).toFixed(1) : 0,
        cancellationRate,
        refundRate,
        repeatCustomers,
        newCustomers,
      },
      charts: {
        revenueTrend: revenueByDate(allBookings),
        bookingTrend: countByDate(allBookings),
        platformFeeTrend: platformFeeByDate,
        userGrowth: countByDate(usersRes.data ?? []),
        salonGrowth: countByDate(salonsRes.data ?? []),
        reviewGrowth: countByDate(reviewsRes.data ?? []),
      },
      distributions: {
        bookingStatus: Object.entries(bookingsByStatus).map(([status, count]) => ({ status, count })),
        bookingSource: Object.entries(bookingsBySource).map(([source, count]) => ({ source, count })),
        paymentMethod: Object.entries(paymentsByMethod).map(([method, count]) => ({ method, count })),
        paymentStatus: Object.entries(paymentsByStatus).map(([status, count]) => ({ status, count })),
      },
      topServices,
      topSalons,
      peakHours: Object.entries(peakHours).sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count })),
      peakDays: Object.entries(peakDays).map(([day, count]) => ({ day, count })),
    });
  } catch { res.status(500).json({ error: "Failed to fetch analytics" }); }
});

adminRouter.get("/bookings/export", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { format = "csv", status, date_from, date_to, salon_id, payment_status, source } = req.query as Record<string, string>;

    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT);

    if (status) query = query.eq("status", status);
    if (date_from) query = query.gte("booking_date", date_from);
    if (date_to) query = query.lte("booking_date", date_to);
    if (salon_id) query = query.eq("salon_id", salon_id);
    if (payment_status) query = query.eq("payment_status", payment_status);
    if (source) query = query.eq("booking_source", source);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }

    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = [
      "Booking Reference", "Customer Name", "Customer Phone", "Customer Email",
      "Salon Name", "Salon Owner", "Booked Services", "Assigned Staff",
      "Booking Date", "Start Time", "End Time", "Duration (min)",
      "Subtotal", "Discount", "Platform Fee", "Tax", "Final Amount",
      "Payment Method", "Payment Status", "Booking Status",
      "Booking Source", "Special Request", "Created Date", "Updated Date",
      "Cancellation Reason", "Notes",
    ];

    const rows = (data ?? []).map((b: any) => [
      esc(b.booking_reference || b.id),
      esc(b.customer_name || b.user?.full_name || ""),
      esc(b.customer_phone || b.user?.phone || ""),
      esc(b.customer_email || b.user?.email || ""),
      esc(b.salon?.name || ""),
      esc(b.salon?.owner?.full_name || ""),
      esc((b.booking_services ?? []).map((s: any) => s.service_name).join("; ")),
      esc(b.staff?.name || ""),
      esc(b.booking_date || ""),
      esc(b.start_time || ""),
      esc(b.end_time || ""),
      esc(b.total_duration_min || 0),
      esc(b.subtotal ?? 0),
      esc(b.discount_amount ?? 0),
      esc(b.platform_fee ?? 0),
      esc(b.tax_amount ?? 0),
      esc(b.total_amount ?? 0),
      esc(b.payment_method || ""),
      esc(b.payment_status || ""),
      esc(b.status || ""),
      esc(b.booking_source || "website"),
      esc(b.special_request || ""),
      esc(b.created_at || ""),
      esc(b.updated_at || ""),
      esc(b.cancellation_reason || ""),
      esc(b.notes || ""),
    ]);

    if (format === "excel") {
      const xlsxRows = rows.map(r => `<row>${r.map(c => `<cell><value t="inlineStr"><is><t>${c.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></is></value></cell>`).join("")}</row>`).join("");
      const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Bookings"><Table>${headers.map(h => `<Column ss:Width="120"/>`).join("")}${headers.map((h, i) => `<Row>${i === 0 ? "" : ""}</Row>`).join("")}<Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join("")}</Row>${xlsxRows}</Table></Worksheet></Workbook>`;
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader("Content-Disposition", `attachment; filename="bookings-export-${new Date().toISOString().slice(0, 10)}.xls"`);
      res.send(xml);
      return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([headers.join(","), ...rows.map(r => r.join(","))].join("\r\n"));
  } catch { res.status(500).json({ error: "Failed to export bookings" }); }
});

adminRouter.get("/bookings/diagnostic", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();

    const [bookingsSimple, bookingsCount, schemaCheck] = await Promise.all([
      supabase.from("bookings").select("id, status, created_at").limit(5),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("*, salon:salons!salon_id(id, name)").limit(1),
    ]);

    res.json({
      simpleQuery: { data: bookingsSimple.data, error: bookingsSimple.error },
      countQuery: { count: bookingsCount.count, error: bookingsCount.count },
      joinQuery: { data: schemaCheck.data, error: schemaCheck.error },
    });
  } catch (err) {
    console.error("[Admin] Diagnostic error:", err);
    res.status(500).json({ error: String(err) });
  }
});

adminRouter.get("/bookings", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const {
      status, search, page = "1", limit = "50",
      date_from, date_to, salon_id, payment_status, source,
      payment_method, customer_email, customer_phone,
    } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT, { count: "exact" });

    if (status) query = query.eq("status", status);
    if (payment_status) query = query.eq("payment_status", payment_status);
    if (source) query = query.eq("booking_source", source);
    if (salon_id) query = query.eq("salon_id", salon_id);
    if (date_from) query = query.gte("booking_date", date_from);
    if (date_to) query = query.lte("booking_date", date_to);
    if (customer_email) query = query.ilike("customer_email", `%${customer_email}%`);
    if (customer_phone) query = query.ilike("customer_phone", `%${customer_phone}%`);

    if (search) {
      query = query.or(`booking_reference.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[Admin] Bookings query error:", JSON.stringify(error));
      const fallback = await supabase
        .from("bookings")
        .select("*, user:profiles!user_id(full_name, email, phone), salon:salons!salon_id(id, name, slug), booking_services(*), payment:payments(*)")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fallback.error) {
        console.error("[Admin] Fallback query also failed:", JSON.stringify(fallback.error));
        const basic = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).range(from, to);
        if (basic.error) {
          console.error("[Admin] Basic query also failed:", JSON.stringify(basic.error));
          res.status(500).json({ error: basic.error.message || "Failed to fetch bookings" });
          return;
        }
        res.json({
          bookings: basic.data ?? [],
          total: basic.data?.length ?? 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 1,
          warning: "Returned without joins due to query error",
        });
        return;
      }

      res.json({
        bookings: fallback.data ?? [],
        total: fallback.data?.length ?? 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 1,
        warning: "Returned without all joins",
      });
      return;
    }

    res.json({
      bookings: data ?? [],
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error("[Admin] Bookings catch error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

adminRouter.put("/bookings/:id/refund", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { refund_amount, refund_reason } = req.body;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, payment:payments(*)")
      .eq("id", req.params.id)
      .single();

    if (bookingError || !booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const payments = Array.isArray(booking.payment) ? booking.payment : booking.payment ? [booking.payment] : [];
    const payment = payments[0];
    if (!payment) { res.status(400).json({ error: "No payment found for this booking" }); return; }

    const amount = refund_amount ?? payment.amount ?? booking.total_amount;

    const { data: updatedPayment, error: paymentError } = await supabase
      .from("payments")
      .update({
        status: "refunded",
        refund_amount: amount,
        refund_reason: refund_reason || "Admin refund",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .select()
      .single();

    if (paymentError) { res.status(500).json({ error: paymentError.message }); return; }

    await supabase
      .from("bookings")
      .update({ payment_status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (booking.user_id) {
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "Refund Processed",
        body: `Refund of ₹${amount} has been processed for your booking ${booking.booking_reference || ""}.`,
        type: "refund",
        is_read: false,
      });
    }

    res.json(updatedPayment);
  } catch { res.status(500).json({ error: "Failed to process refund" }); }
});

adminRouter.put("/bookings/:id/status", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { status, cancellation_reason } = req.body;

    if (!status) { res.status(400).json({ error: "status is required" }); return; }

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const allowedNext = VALID_TRANSITIONS[booking.status] || [];
    if (!allowedNext.includes(status)) {
      res.status(400).json({ error: `Cannot transition from '${booking.status}' to '${status}'. Allowed: ${allowedNext.join(", ") || "none"}` });
      return;
    }

    if (status === "cancelled" && !cancellation_reason) {
      res.status(400).json({ error: "cancellation_reason is required" });
      return;
    }

    const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") {
      updateData.cancellation_reason = cancellation_reason;
      updateData.cancelled_at = new Date().toISOString();
    }
    if (status === "checked_in") updateData.check_in_time = new Date().toISOString();
    if (status === "completed") updateData.completed_time = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", req.params.id)
      .select(BOOKING_SELECT)
      .single();

    if (updateError) { res.status(500).json({ error: updateError.message }); return; }

    if (booking.user_id) {
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        type: "booking_status_changed",
        title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        body: status === "cancelled"
          ? `Your booking has been cancelled. Reason: ${cancellation_reason}`
          : `Your booking status has been updated to '${status}'.`,
        data: { booking_id: req.params.id, status },
      });
    }

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update booking status" }); }
});

adminRouter.put("/bookings/:id/reschedule", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { booking_date, start_time, end_time, reason } = req.body;

    if (!booking_date || !start_time || !end_time) {
      res.status(400).json({ error: "booking_date, start_time, and end_time are required" });
      return;
    }

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.status === "cancelled" || booking.status === "completed") {
      res.status(400).json({ error: `Cannot reschedule a ${booking.status} booking` });
      return;
    }

    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id")
      .eq("salon_id", booking.salon_id)
      .eq("booking_date", booking_date)
      .not("status", "in", "(cancelled,no_show)")
      .neq("id", req.params.id)
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    if (overlapping && overlapping.length > 0) {
      res.status(409).json({ error: "Selected time slot is already booked" });
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ booking_date, start_time, end_time, updated_at: new Date().toISOString(), notes: reason ? `${booking.notes ? booking.notes + "\n" : ""}Rescheduled: ${reason}` : booking.notes })
      .eq("id", req.params.id)
      .select(BOOKING_SELECT)
      .single();

    if (updateError) { res.status(500).json({ error: updateError.message }); return; }

    if (booking.user_id) {
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        type: "booking_rescheduled",
        title: "Booking Rescheduled",
        body: `Your booking has been rescheduled to ${booking_date} at ${start_time}.`,
        data: { booking_id: req.params.id },
      });
    }

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to reschedule booking" }); }
});

// ── PAYMENTS ──
adminRouter.get("/payments", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("payments")
      .select("*, user:profiles(full_name, email), booking:bookings(id, salon_id, status, booking_source, salon:salons(name))")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const allPayments = data ?? [];
    const isRevenue = (p: any) => {
      const ps = (p.status || "").toLowerCase();
      const src = (p.booking?.booking_source || "").toLowerCase();
      return (src === "website" || src === "glamspot") && (ps === "completed" || ps === "paid");
    };

    const revenuePayments = allPayments.filter(isRevenue);
    const dailyRevenue = revenuePayments.filter((p: any) => p.created_at?.startsWith(today)).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const monthlyRevenue = revenuePayments.filter((p: any) => p.created_at >= monthStart).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const yearlyRevenue = revenuePayments.filter((p: any) => p.created_at >= yearStart).reduce((s: number, p: any) => s + (p.amount || 0), 0);

    res.json({
      payments: allPayments.map((p: any) => ({
        id: p.id, transaction_id: (p.payment_provider_payment_id || p.id).slice(0, 12).toUpperCase(),
        user: p.user?.full_name || "Unknown", email: p.user?.email || "",
        salon: p.booking?.salon?.name || "Unknown", amount: p.amount,
        status: p.status, method: p.payment_method, date: p.created_at,
        refund_amount: p.refund_amount || 0,
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

// ── STAFF ──
adminRouter.get("/salons/:salonId/staff", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_staff")
      .select("id, name, role, is_active")
      .eq("salon_id", req.params.salonId)
      .order("name", { ascending: true });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch staff" }); }
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
