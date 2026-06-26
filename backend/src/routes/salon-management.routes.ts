import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getSupabaseServerClient } from "../integrations/supabase/client";
import { sendClaimNotification, sendClaimApproved, sendClaimRejected } from "../services/email.service";

export const salonManagementRouter = Router();

const ownerOrAdmin = requireRole("salon_owner", "admin");

async function getSalonIds(userId: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", userId);
  return (data ?? []).map((s) => s.id);
}

async function getSalonId(userId: string): Promise<string | null> {
  const ids = await getSalonIds(userId);
  return ids[0] ?? null;
}

// ── CLAIMS ──
salonManagementRouter.post("/claims", authMiddleware, async (req, res) => {
  try {
    console.log("Claim API hit");
    console.log(req.body);
    const user = (req as any).user;
    const { salonId, verification_message } = req.body;

    if (!salonId) {
      console.log("Claim error: salonId is required");
      res.status(400).json({ error: "salonId is required" });
      return;
    }

    const supabase = getSupabaseServerClient();

    console.log("Supabase user context");
    await supabase.auth.getUser(
      req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined
    ).then(({ data: d }) => console.log("auth.getUser().user:", d?.user?.id ?? "NULL"))
     .catch((e) => console.log("auth.getUser() error:", e?.message));

    // Detect if service_role key is actually being used (RLS bypass test)
    const { error: rlsTest } = await supabase.from("salon_claims").select("id").limit(1).maybeSingle();
    console.log("RLS bypass test:", rlsTest ? `BLOCKED (${rlsTest.message})` : "PASSED (service_role bypass)");

    // Check for existing claim
    const { data: existing } = await supabase
      .from("salon_claims")
      .select("id, status")
      .eq("salon_id", salonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      console.log("Claim already exists:", existing.status);
      res.status(409).json({ error: `Claim already exists (${existing.status})` });
      return;
    }

    // Get salon name and user profile details
    const { data: salon } = await supabase
      .from("salons")
      .select("id, name, email, phone")
      .eq("id", salonId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();

    const salonName = salon?.name || "Unknown Salon";
    const fullName = profile?.full_name || user.email || "Unknown";
    const email = profile?.email || user.email || "";
    const phone = profile?.phone || "";
    const businessEmail = salon?.email || "";
    const businessPhone = salon?.phone || "";

    const payload = {
      salon_id: salonId,
      user_id: user.id,
      salon_name: salonName,
      full_name: fullName,
      email: email,
      phone: phone,
      business_email: businessEmail,
      business_phone: businessPhone,
      verification_message: verification_message || "",
      status: "pending",
    };
    console.log("CLAIM INSERT PAYLOAD");
    console.log(payload);
    const { data, error } = await supabase
      .from("salon_claims")
      .insert(payload)
      .select()
      .single();

    console.log("INSERT DATA", data);
    console.log("INSERT ERROR", error);

    if (error) {
      throw error;
    }

    // Send email notification (non-blocking — won't fail the request)
    try {
      sendClaimNotification({
        salonName,
        salonId,
        claimantName: fullName,
        claimantEmail: email,
        claimantPhone: phone,
        verificationMessage: verification_message || "",
        submittedDate: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        claimId: data.id,
      });
    } catch (emailErr) {
      console.log("Email notification skipped (resend not configured):", emailErr);
    }

    res.status(201).json({ message: "Claim request submitted successfully. Our team will review it.", claim: data });
  } catch (err) {
    console.error("Claim submission error:", err);
    const message = err?.message || String(err);
    res.status(500).json({ error: message });
  }
});

salonManagementRouter.get("/claims", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name, slug, locality, city, address)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }

    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch claims" }); }
});

salonManagementRouter.get("/claims/pending", authMiddleware, requireRole("admin"), async (_req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name, slug, locality, city, address, phone)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch pending claims" }); }
});

salonManagementRouter.put("/claims/:id/approve", authMiddleware, requireRole("admin"), async (req, res) => {
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

    const now = new Date().toISOString();

    const { error: claimErr } = await supabase
      .from("salon_claims")
      .update({ status: "approved", approved_by: admin.id, approved_at: now, updated_at: now })
      .eq("id", req.params.id);
    if (claimErr) { res.status(500).json({ error: claimErr.message }); return; }

    const { error: salonErr } = await supabase
      .from("salons")
      .update({ owner_id: claim.user_id, is_claimed: true, claimed_at: now })
      .eq("id", claim.salon_id);
    if (salonErr) { res.status(500).json({ error: salonErr.message }); return; }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ role: "salon_owner" })
      .eq("id", claim.user_id);
    if (profileErr) { res.status(500).json({ error: profileErr.message }); return; }

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

    console.log(`Claim ${req.params.id} approved via salon-management route`);

    try {
      sendClaimApproved({
        email: claim.email || "",
        salonName: claim.salon_name || claim.salon?.name || "Salon",
        ownerName: claim.full_name || "Owner",
      });
    } catch (emailErr) {
      console.log("Approval email skipped:", emailErr);
    }

    res.json({ message: `Salon "${claim.salon_name || claim.salon?.name}" approved and assigned` });
  } catch { res.status(500).json({ error: "Failed to approve claim" }); }
});

salonManagementRouter.put("/claims/:id/reject", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const admin = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { data: claim } = await supabase
      .from("salon_claims")
      .select("*, salon:salons(name)")
      .eq("id", req.params.id)
      .single();

    const { error } = await supabase
      .from("salon_claims")
      .update({ status: "rejected", rejected_by: admin.id, rejected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", req.params.id);
    if (error) { res.status(500).json({ error: error.message }); return; }

    console.log(`Claim ${req.params.id} rejected via salon-management route`);

    if (claim) {
      try {
        sendClaimRejected({
          email: claim.email || "",
          salonName: claim.salon_name || claim.salon?.name || "Salon",
          ownerName: claim.full_name || "Owner",
        });
      } catch (emailErr) {
        console.log("Rejection email skipped:", emailErr);
      }
    }

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
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();
    let salonId: string | null;
    if (userRole === "admin" && req.query.salonId) {
      salonId = req.query.salonId as string;
    } else {
      salonId = await getSalonId(user.id);
    }
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
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();
    let salonId: string | null;
    if (userRole === "admin" && req.query.salonId) {
      salonId = req.query.salonId as string;
    } else {
      salonId = await getSalonId(user.id);
    }
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
    const { name, role, experience, photo, specialization, phone, email, bio, working_days, working_hours } = req.body;
    if (!name) { res.status(400).json({ error: "Name is required" }); return; }
    const { data, error } = await supabase
      .from("salon_staff")
      .insert({
        salon_id: salonId,
        name,
        role,
        experience,
        photo,
        specialization,
        phone: phone || null,
        email: email || null,
        bio: bio || null,
        working_days: working_days || null,
        working_hours: working_hours || null,
      })
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
    const { name, role, experience, photo, specialization, is_active, phone, email, bio, working_days, working_hours } = req.body;
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (experience !== undefined) updateData.experience = experience;
    if (photo !== undefined) updateData.photo = photo;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (working_days !== undefined) updateData.working_days = working_days;
    if (working_hours !== undefined) updateData.working_hours = working_hours;
    const { data, error } = await supabase
      .from("salon_staff")
      .update(updateData)
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
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();
    let salonIds: string[];
    if (userRole === "admin" && req.query.salonId) {
      salonIds = [req.query.salonId as string];
    } else {
      salonIds = await getSalonIds(user.id);
    }
    if (salonIds.length === 0) { res.status(404).json({ error: "No salon found" }); return; }
    const status = req.query.status as string | undefined;

    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("*")
      .in("salon_id", salonIds)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (bookingsErr) { res.status(500).json({ error: `Failed to fetch bookings: ${bookingsErr.message}` }); return; }
    if (!bookings || bookings.length === 0) { res.json([]); return; }

    const userIds = [...new Set(bookings.map((b: any) => b.user_id).filter(Boolean))];
    const staffIds = [...new Set(bookings.map((b: any) => b.staff_id).filter(Boolean))];
    const bookingIds = bookings.map((b: any) => b.id);

    const [profilesRes, staffRes, servicesRes, paymentsRes] = await Promise.all([
      userIds.length > 0 ? supabase.from("profiles").select("id, full_name, phone, email").in("id", userIds) : { data: [], error: null },
      staffIds.length > 0 ? supabase.from("salon_staff").select("id, name, role, avatar_url").in("id", staffIds) : { data: [], error: null },
      bookingIds.length > 0 ? supabase.from("booking_services").select("id, booking_id, service_id, service_name, price").in("booking_id", bookingIds) : { data: [], error: null },
      bookingIds.length > 0 ? supabase.from("payments").select("id, booking_id, amount, status, payment_method, currency").in("booking_id", bookingIds) : { data: [], error: null },
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
    const staffMap = new Map((staffRes.data ?? []).map((s: any) => [s.id, s]));
    const servicesByBooking = new Map<string, any[]>();
    for (const svc of servicesRes.data ?? []) {
      if (!servicesByBooking.has(svc.booking_id)) servicesByBooking.set(svc.booking_id, []);
      servicesByBooking.get(svc.booking_id)!.push(svc);
    }
    const paymentByBooking = new Map<string, any>();
    for (const pay of paymentsRes.data ?? []) {
      if (!paymentByBooking.has(pay.booking_id)) paymentByBooking.set(pay.booking_id, pay);
    }

    let enriched = bookings.map((b: any) => ({
      ...b,
      user: profileMap.get(b.user_id) || null,
      staff: b.staff_id ? (staffMap.get(b.staff_id) || null) : null,
      booking_services: servicesByBooking.get(b.id) || [],
      payment: paymentByBooking.get(b.id) || null,
    }));

    if (status && status !== "all") {
      enriched = enriched.filter((b: any) => b.status === status);
    }

    res.json(enriched);
  } catch (err: any) {
    console.error("[SALON-MGMT] Bookings fetch error:", err);
    res.status(500).json({ error: `Failed to fetch bookings: ${err.message}` });
  }
});

salonManagementRouter.put("/bookings/:id/status", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, salon:salons(owner_id)")
      .eq("id", req.params.id)
      .single();
    if (fetchErr || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (userRole !== "admin" && booking.salon?.owner_id !== user.id) {
      res.status(403).json({ error: "Not authorized for this booking" }); return;
    }

    const { status: newStatus, cancellation_reason } = req.body;
    if (!newStatus) { res.status(400).json({ error: "Status is required" }); return; }

    const currentStatus = booking.status;
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["checked_in", "cancelled"],
      checked_in: ["in_progress"],
      in_progress: ["completed"],
    };

    if (newStatus === "cancelled") {
      if (!cancellation_reason) { res.status(400).json({ error: "Cancellation reason is required" }); return; }
    } else {
      const allowed = validTransitions[currentStatus];
      if (!allowed || !allowed.includes(newStatus)) {
        res.status(400).json({ error: `Cannot transition from ${currentStatus} to ${newStatus}` });
        return;
      }
    }

    const updateData: any = { status: newStatus };
    if (newStatus === "cancelled") {
      updateData.cancellation_reason = cancellation_reason;
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", req.params.id)
      .select()
      .single();
    if (updateErr) { res.status(500).json({ error: updateErr.message }); return; }

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert({
        user_id: booking.user_id,
        type: "booking_status_changed",
        title: "Booking status updated",
        body: `Your booking is now ${newStatus}`,
        data: { booking_id: req.params.id, status: newStatus },
      });
    if (notifErr) { console.log("Notification creation failed:", notifErr); }

    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update booking status" }); }
});

// ── CUSTOMERS ──
salonManagementRouter.get("/customers", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();
    let salonId: string | null;
    if (userRole === "admin" && req.query.salonId) {
      salonId = req.query.salonId as string;
    } else {
      salonId = await getSalonId(user.id);
    }
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
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();
    let salonId: string | null;
    if (userRole === "admin" && req.query.salonId) {
      salonId = req.query.salonId as string;
    } else {
      salonId = await getSalonId(user.id);
    }
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

// ── ASSIGN STAFF TO BOOKING ──
salonManagementRouter.put("/bookings/:id/staff", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();

    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .select("id, salon_id, booking_date, start_time, end_time")
      .eq("id", req.params.id)
      .single();
    if (bookErr || !booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const salonId = booking.salon_id;
    const { staff_id } = req.body;
    if (!staff_id) { res.status(400).json({ error: "staff_id is required" }); return; }

    const { data: staff, error: staffErr } = await supabase
      .from("salon_staff")
      .select("id, is_active")
      .eq("id", staff_id)
      .eq("salon_id", salonId)
      .single();
    if (staffErr || !staff) { res.status(404).json({ error: "Staff not found in this salon" }); return; }
    if (!staff.is_active) { res.status(400).json({ error: "Staff member is not active" }); return; }

    const { data: conflicting } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("staff_id", staff_id)
      .eq("booking_date", booking.booking_date)
      .neq("status", "cancelled")
      .neq("id", req.params.id);

    if (conflicting) {
      const hasOverlap = conflicting.some(
        (b: any) => b.start_time < booking.end_time && b.end_time > booking.start_time
      );
      if (hasOverlap) { res.status(409).json({ error: "Staff member already has a booking at this time" }); return; }
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ staff_id })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to assign staff" }); }
});

// ── RESCHEDULE BOOKING ──
salonManagementRouter.put("/bookings/:id/reschedule", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, salon:salons(owner_id)")
      .eq("id", req.params.id)
      .single();
    if (fetchErr || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (userRole !== "admin" && booking.salon?.owner_id !== user.id) {
      res.status(403).json({ error: "Not authorized for this booking" }); return;
    }

    const { booking_date, start_time, end_time } = req.body;
    if (!booking_date || !start_time || !end_time) {
      res.status(400).json({ error: "booking_date, start_time, and end_time are required" }); return;
    }

    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id")
      .eq("salon_id", booking.salon_id)
      .eq("booking_date", booking_date)
      .neq("status", "cancelled")
      .neq("id", req.params.id)
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    if (overlapping && overlapping.length > 0) {
      res.status(409).json({ error: "This time slot is already booked" }); return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ booking_date, start_time, end_time })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert({
        user_id: booking.user_id,
        type: "booking_rescheduled",
        title: "Booking rescheduled",
        body: `Your booking has been rescheduled to ${booking_date} at ${start_time}`,
        data: { booking_id: req.params.id, booking_date, start_time, end_time },
      });
    if (notifErr) { console.log("Notification creation failed:", notifErr); }

    res.json(data);
  } catch { res.status(500).json({ error: "Failed to reschedule booking" }); }
});

// ── NOTIFICATIONS ──
salonManagementRouter.post("/notifications", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServerClient();
    const { user_id, type, title, body, data } = req.body;
    if (!user_id || !type || !title) {
      res.status(400).json({ error: "user_id, type, and title are required" }); return;
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({ user_id, type, title, body, data })
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(201).json(notification);
  } catch { res.status(500).json({ error: "Failed to create notification" }); }
});

salonManagementRouter.get("/notifications", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();
    let salonId: string | null;
    if (userRole === "admin" && req.query.salonId) {
      salonId = req.query.salonId as string;
    } else {
      salonId = await getSalonId(user.id);
    }
    if (!salonId) { res.status(404).json({ error: "No salon found" }); return; }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("salon_id", salonId)
      .not("user_id", "is", null);

    const userIds = [...new Set((bookings ?? []).map((b: any) => b.user_id))];
    if (userIds.length === 0) { res.json([]); return; }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data ?? []);
  } catch { res.status(500).json({ error: "Failed to fetch notifications" }); }
});

// ── BOOKING STATUS SHORTCUTS ──
salonManagementRouter.put("/bookings/:id/check-in", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("status, salon:salons(owner_id)")
      .eq("id", req.params.id)
      .single();
    if (fetchErr || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (userRole !== "admin" && booking.salon?.owner_id !== user.id) {
      res.status(403).json({ error: "Not authorized for this booking" }); return;
    }
    if (booking.status !== "confirmed") {
      res.status(400).json({ error: "Booking must be confirmed before check-in" }); return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "checked_in" })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to check in" }); }
});

salonManagementRouter.put("/bookings/:id/start-service", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("status, salon:salons(owner_id)")
      .eq("id", req.params.id)
      .single();
    if (fetchErr || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (userRole !== "admin" && booking.salon?.owner_id !== user.id) {
      res.status(403).json({ error: "Not authorized for this booking" }); return;
    }
    if (booking.status !== "checked_in") {
      res.status(400).json({ error: "Booking must be checked in before starting service" }); return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "in_progress" })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch { res.status(500).json({ error: "Failed to start service" }); }
});

salonManagementRouter.put("/bookings/:id/complete-service", authMiddleware, ownerOrAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const userRole = (req as any).userRole;
    const supabase = getSupabaseServerClient();

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("status, user_id, salon:salons(owner_id)")
      .eq("id", req.params.id)
      .single();
    if (fetchErr || !booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (userRole !== "admin" && booking.salon?.owner_id !== user.id) {
      res.status(403).json({ error: "Not authorized for this booking" }); return;
    }
    if (booking.status !== "in_progress") {
      res.status(400).json({ error: "Booking must be in progress before completing" }); return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }

    const { error: payErr } = await supabase
      .from("payments")
      .update({ status: "completed" })
      .eq("booking_id", req.params.id);
    if (payErr) { console.log("Payment update failed:", payErr); }

    const { data: fullBooking } = await supabase
      .from("bookings")
      .select("*, payment:payments(*)")
      .eq("id", req.params.id)
      .single();

    res.json(fullBooking);
  } catch { res.status(500).json({ error: "Failed to complete service" }); }
});
