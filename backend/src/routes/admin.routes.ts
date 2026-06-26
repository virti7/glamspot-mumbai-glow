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

const BOOKING_SELECT = "*, salon:salons(name, slug, locality, city, cover_image, phone), user:profiles(full_name, email, phone), booking_services(*), payment:payments(*), staff:salon_staff(id, name, role, avatar_url)";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "completed", "cancelled"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

adminRouter.get("/bookings/stats", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const today = new Date().toISOString().slice(0, 10);

    const [totalRes, todayRes, pendingRes, confirmedRes, completedRes, cancelledRes, completedRevenueRes, todayRevenueRes] = await Promise.all([
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", today),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
      supabase.from("bookings").select("total_amount").eq("status", "completed"),
      supabase.from("bookings").select("total_amount").eq("status", "completed").gte("created_at", today),
    ]);

    const totalRevenue = (completedRevenueRes.data ?? []).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const todayRevenue = (todayRevenueRes.data ?? []).reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
    const totalCount = totalRes.count ?? 0;
    const averageBookingValue = totalCount > 0 ? +(totalRevenue / totalCount).toFixed(2) : 0;

    res.json({
      totalBookings: totalRes.count ?? 0,
      todayBookings: todayRes.count ?? 0,
      pendingBookings: pendingRes.count ?? 0,
      confirmedBookings: confirmedRes.count ?? 0,
      completedBookings: completedRes.count ?? 0,
      cancelledBookings: cancelledRes.count ?? 0,
      totalRevenue,
      todayRevenue,
      averageBookingValue,
    });
  } catch { res.status(500).json({ error: "Failed to fetch booking stats" }); }
});

adminRouter.get("/bookings/export", async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }

    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = "Booking Reference,Customer Name,Customer Phone,Customer Email,Salon,Services,Booking Date,Start Time,End Time,Amount,Discount,Tax,Platform Fee,Total,Payment Status,Booking Status,Created At";
    const rows = (data ?? []).map((b: any) => [
      esc(b.booking_reference || b.id),
      esc(b.customer_name || b.user?.full_name || ""),
      esc(b.customer_phone || b.user?.phone || ""),
      esc(b.customer_email || b.user?.email || ""),
      esc(b.salon?.name || ""),
      esc((b.booking_services ?? []).map((s: any) => s.service_name || s.name || "").join("; ")),
      esc(b.booking_date || ""),
      esc(b.start_time || ""),
      esc(b.end_time || ""),
      esc(b.subtotal ?? 0),
      esc(b.discount_amount ?? 0),
      esc(b.tax_amount ?? 0),
      esc(b.platform_fee ?? 0),
      esc(b.total_amount ?? 0),
      esc(b.payment_status || ""),
      esc(b.status || ""),
      esc(b.created_at || ""),
    ].join(","));

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="bookings-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send([headers, ...rows].join("\r\n"));
  } catch { res.status(500).json({ error: "Failed to export bookings" }); }
});

adminRouter.get("/bookings", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { status, search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("booking_reference", `%${search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) { res.status(500).json({ error: error.message }); return; }

    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch bookings" }); }
});

adminRouter.put("/bookings/:id/refund", async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { refund_amount } = req.body;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, payment:payments(*)")
      .eq("id", req.params.id)
      .single();

    if (bookingError || !booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const payment = booking.payment;
    if (!payment) { res.status(400).json({ error: "No payment found for this booking" }); return; }

    const amount = refund_amount ?? payment.amount ?? booking.total_amount;

    const { data: updatedPayment, error: paymentError } = await supabase
      .from("payments")
      .update({
        status: "refunded",
        refund_amount: amount,
        refund_reason: "Admin refund",
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

    await supabase.from("notifications").insert({
      user_id: booking.user_id,
      title: "Refund Processed",
      body: `Refund of ₹${amount} has been processed for your booking.`,
      type: "refund",
      is_read: false,
      created_at: new Date().toISOString(),
    });

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
      res.status(400).json({ error: `Cannot transition from '${booking.status}' to '${status}'. Allowed transitions: ${allowedNext.join(", ") || "none"}` });
      return;
    }

    if (status === "cancelled" && !cancellation_reason) {
      res.status(400).json({ error: "cancellation_reason is required when cancelling a booking" });
      return;
    }

    const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") {
      updateData.cancellation_reason = cancellation_reason;
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", req.params.id)
      .select(BOOKING_SELECT)
      .single();

    if (updateError) { res.status(500).json({ error: updateError.message }); return; }

    await supabase.from("notifications").insert({
      user_id: booking.user_id,
      type: "booking_status_changed",
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: status === "cancelled"
        ? `Your booking has been cancelled. Reason: ${cancellation_reason}`
        : `Your booking status has been updated to '${status}'.`,
      data: { booking_id: req.params.id, status },
    });

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update booking status" }); }
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

    const bookings = await supabase.from("bookings").select("id, total_amount, status, created_at, salon:salons(name), user:profiles(full_name, email)").order("created_at", { ascending: false });

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
        user: b.user?.full_name, salon: b.salon?.name,
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
