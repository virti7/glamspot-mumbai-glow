import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getSupabaseServerClient } from "../integrations/supabase/client";

export const bookingRouter = Router();

function generateBookingReference(): string {
  const timestamp = Date.now().toString().slice(-6);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GS-${timestamp}${random}`;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isTimeInPast(dateStr: string, timeStr: string): boolean {
  const now = new Date();
  const [y, M, d] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  const slotDate = new Date(y, M - 1, d, h, m, 0, 0);
  return slotDate.getTime() < now.getTime();
}

function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  return start1 < end2 && start2 < end1;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return formatTime(Math.floor(total / 60), total % 60);
}

bookingRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      salonId,
      services,
      bookingDate,
      startTime,
      endTime,
      customerName,
      customerPhone,
      customerEmail,
      specialRequest,
      staffId,
      paymentMethod,
    } = req.body;

    if (!salonId || !services?.length || !bookingDate || !startTime || !endTime || !customerName || !customerPhone || !customerEmail) {
      res.status(400).json({ error: "Missing required fields: salonId, services, bookingDate, startTime, endTime, customerName, customerPhone, customerEmail" });
      return;
    }

    const supabase = getSupabaseServerClient();

    const { data: overlappingBookings, error: overlapErr } = await supabase
      .from("bookings")
      .select("id, start_time, end_time")
      .eq("salon_id", salonId)
      .eq("booking_date", bookingDate)
      .not("status", "in", "(cancelled,no_show)")
      .lt("start_time", endTime)
      .gt("end_time", startTime);

    if (overlapErr) {
      res.status(500).json({ error: "Failed to verify slot availability" });
      return;
    }

    if (overlappingBookings && overlappingBookings.length > 0) {
      res.status(409).json({ error: "This time slot is already booked. Please select a different time." });
      return;
    }

    let subtotal = 0;
    let discountAmount = 0;
    let totalDuration = 0;

    const serviceRecords: Array<{
      service_id: string;
      service_name: string;
      price: number;
      duration_min: number;
    }> = [];

    for (const svc of services) {
      const { data: serviceDef, error: svcErr } = await supabase
        .from("salon_services")
        .select("id, name, price, duration_minutes, discounted_price")
        .eq("id", svc.serviceId)
        .single();

      const name = svc.name || serviceDef?.name || "Unknown Service";
      const price = svc.price ?? serviceDef?.price ?? 0;
      const durationMin = svc.durationMin ?? serviceDef?.duration_minutes ?? 60;

      subtotal += price;
      totalDuration += durationMin;

      if (serviceDef?.discounted_price != null && serviceDef.discounted_price < price) {
        discountAmount += price - serviceDef.discounted_price;
      }

      serviceRecords.push({
        service_id: svc.serviceId,
        service_name: name,
        price,
        duration_min: durationMin,
      });
    }

    const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.12 * 100) / 100;
    const totalAmount = Math.round((subtotal - discountAmount + platformFee + taxAmount) * 100) / 100;
    const bookingReference = generateBookingReference();

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        salon_id: salonId,
        staff_id: staffId || null,
        status: "pending",
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        total_duration_min: totalDuration,
        total_amount: totalAmount,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        special_request: specialRequest || null,
        booking_reference: bookingReference,
        payment_status: "pending",
        payment_method: paymentMethod || null,
        platform_fee: platformFee,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        subtotal: subtotal,
        booking_source: "website",
        created_by: user.id,
      })
      .select()
      .single();

    if (bookingErr) {
      res.status(500).json({ error: `Failed to create booking: ${bookingErr.message}` });
      return;
    }

    const bookingId = booking.id;

    if (serviceRecords.length > 0) {
      const { error: svcInsertErr } = await supabase.from("booking_services").insert(
        serviceRecords.map((s) => ({
          booking_id: bookingId,
          service_id: s.service_id,
          service_name: s.service_name,
          price: s.price,
          duration_min: s.duration_min,
        })),
      );

      if (svcInsertErr) {
        await supabase.from("bookings").delete().eq("id", bookingId);
        res.status(500).json({ error: `Booking created but failed to add services: ${svcInsertErr.message}` });
        return;
      }
    }

    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .insert({
        booking_id: bookingId,
        user_id: user.id,
        amount: totalAmount,
        currency: "INR",
        status: "pending",
        payment_method: paymentMethod || null,
      })
      .select()
      .single();

    if (paymentErr) {
      await supabase.from("bookings").delete().eq("id", bookingId);
      if (serviceRecords.length > 0) {
        await supabase.from("booking_services").delete().eq("booking_id", bookingId);
      }
      res.status(500).json({ error: `Booking created but payment record failed: ${paymentErr.message}` });
      return;
    }

    res.status(201).json({
      ...booking,
      booking_services: serviceRecords,
      payment,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create booking: ${err.message}` });
  }
});

bookingRouter.get("/available-slots", authMiddleware, async (req, res) => {
  try {
    const { salonId, date, staffId, duration } = req.query;
    const slotDuration = parseInt(duration as string, 10) || 30;

    if (!salonId || !date) {
      res.status(400).json({ error: "salonId and date are required" });
      return;
    }

    const supabase = getSupabaseServerClient();
    const [y, M, d] = (date as string).split("-").map(Number);
    const dateObj = new Date(y, M - 1, d);
    const dayOfWeek = dateObj.getDay();

    const { data: hours, error: hoursErr } = await supabase
      .from("salon_hours")
      .select("*")
      .eq("salon_id", salonId)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (hoursErr && hoursErr.code !== "PGRST116") {
      res.status(500).json({ error: "Failed to fetch salon hours" });
      return;
    }

    let openTime: string;
    let closeTime: string;

    if (!hours) {
      console.warn(`No business hours for salon ${salonId} on day ${dayOfWeek}. Using default schedule.`);
      openTime = "10:00";
      closeTime = "20:00";
    } else if (hours.is_closed) {
      res.json([]);
      return;
    } else {
      openTime = hours.open_time;
      closeTime = hours.close_time;
    }

    const slots: Array<{ time: string; available: boolean }> = [];
    let currentSlotStart = openTime;
    while (currentSlotStart < closeTime) {
      const slotEnd = addMinutes(currentSlotStart, slotDuration);
      if (slotEnd <= closeTime) {
        slots.push({ time: currentSlotStart, available: true });
      }
      currentSlotStart = addMinutes(currentSlotStart, slotDuration);
    }

    let bookingQuery = supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("salon_id", salonId)
      .eq("booking_date", date as string)
      .not("status", "in", "(cancelled,no_show)");

    if (staffId) {
      bookingQuery = bookingQuery.eq("staff_id", staffId);
    }

    const { data: existingBookings, error: bookingsErr } = await bookingQuery;

    if (bookingsErr) {
      console.error("available-slots bookingsErr:", bookingsErr);
      res.status(500).json({ error: "Failed to fetch existing bookings" });
      return;
    }

    for (const slot of slots) {
      const slotEnd = addMinutes(slot.time, slotDuration);

      if (isTimeInPast(date as string, slot.time)) {
        slot.available = false;
        continue;
      }

      if (existingBookings) {
        for (const booking of existingBookings) {
          if (timesOverlap(slot.time, slotEnd, booking.start_time, booking.end_time)) {
            slot.available = false;
            break;
          }
        }
      }
    }

    res.json(slots);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch available slots: ${err.message}` });
  }
});

bookingRouter.get("/available-dates", authMiddleware, async (req, res) => {
  try {
    const { salonId, month, year } = req.query;

    if (!salonId || !month) {
      res.status(400).json({ error: "salonId and month are required" });
      return;
    }

    const supabase = getSupabaseServerClient();

    // Support both "YYYY-MM" (from frontend) and separate month/year params
    let yearNum: number;
    let monthNum: number;
    if (year) {
      yearNum = parseInt(year as string, 10);
      monthNum = parseInt(month as string, 10) - 1;
    } else {
      const parts = (month as string).split("-");
      yearNum = parseInt(parts[0], 10);
      monthNum = parseInt(parts[1], 10) - 1;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();

    const { data: hoursData, error: hoursErr } = await supabase
      .from("salon_hours")
      .select("*")
      .eq("salon_id", salonId);

    if (hoursErr) {
      res.status(500).json({ error: "Failed to fetch salon hours" });
      return;
    }

    let effectiveHours = hoursData;
    if (!effectiveHours || effectiveHours.length === 0) {
      console.warn(`No business hours configured for salon ${salonId}. Using default schedule.`);
      effectiveHours = Array.from({ length: 7 }, (_, i) => ({
        day_of_week: i,
        is_closed: false,
        open_time: "10:00",
        close_time: "20:00",
      }));
    }

    const hoursMap = new Map<number, { is_closed: boolean; open_time: string; close_time: string }>();
    for (const h of effectiveHours) {
      hoursMap.set(h.day_of_week, h);
    }

    const { data: allBookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("booking_date, start_time, end_time")
      .eq("salon_id", salonId)
      .gte("booking_date", `${yearNum}-${String(monthNum + 1).padStart(2, "0")}-01`)
      .lte("booking_date", `${yearNum}-${String(monthNum + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`)
      .not("status", "in", "(cancelled,no_show)");

    if (bookingsErr) {
      console.error("available-dates bookingsErr:", bookingsErr);
      res.status(500).json({ error: "Failed to fetch bookings" });
      return;
    }

    const bookingsByDate = new Map<string, Array<{ start_time: string; end_time: string }>>();
    for (const b of allBookings || []) {
      if (!bookingsByDate.has(b.booking_date)) {
        bookingsByDate.set(b.booking_date, []);
      }
      bookingsByDate.get(b.booking_date)!.push({ start_time: b.start_time, end_time: b.end_time });
    }

    const result: Array<{ date: string; available: boolean; reason: string; available_slots: number }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearNum}-${String(monthNum + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(yearNum, monthNum, day);
      const dow = dateObj.getDay();
      const hours = hoursMap.get(dow);
      const isPast = dateObj.getTime() < today.getTime();

      if (isPast) {
        result.push({ date: dateStr, available: false, reason: "Past date", available_slots: 0 });
        continue;
      }

      if (!hours || hours.is_closed) {
        result.push({ date: dateStr, available: false, reason: "Salon closed", available_slots: 0 });
        continue;
      }

      const dayBookings = bookingsByDate.get(dateStr) || [];
      const openMinutes = timeToMinutes(hours.close_time) - timeToMinutes(hours.open_time);
      const slotCount = Math.floor(openMinutes / 30);

      let filledSlots = 0;
      for (const booking of dayBookings) {
        const bStart = timeToMinutes(booking.start_time);
        const bEnd = timeToMinutes(booking.end_time);
        filledSlots += Math.ceil((bEnd - bStart) / 30);
      }

      const availableSlots = slotCount - filledSlots;
      if (filledSlots >= slotCount) {
        result.push({ date: dateStr, available: false, reason: "Fully booked", available_slots: 0 });
      } else {
        result.push({ date: dateStr, available: true, reason: "", available_slots: availableSlots });
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch available dates: ${err.message}` });
  }
});

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

bookingRouter.get("/salon/staff-availability", authMiddleware, async (req, res) => {
  try {
    const { salonId, date, time, duration_min } = req.query;

    if (!salonId || !date || !time || !duration_min) {
      res.status(400).json({ error: "salonId, date, time, and duration_min are required" });
      return;
    }

    const supabase = getSupabaseServerClient();

    const { data: staff, error: staffErr } = await supabase
      .from("salon_staff")
      .select("id, name, role, avatar_url")
      .eq("salon_id", salonId)
      .eq("is_active", true);

    if (staffErr) {
      res.status(500).json({ error: "Failed to fetch staff" });
      return;
    }

    const requestedStart = time as string;
    const requestedEnd = addMinutes(requestedStart, parseInt(duration_min as string, 10));

    const { data: existingBookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("staff_id, start_time, end_time")
      .eq("salon_id", salonId)
      .eq("booking_date", date as string)
      .not("status", "in", "(cancelled,no_show)")
      .not("staff_id", "is", null);

    if (bookingsErr) {
      console.error("staff-availability bookingsErr:", bookingsErr);
      res.status(500).json({ error: "Failed to fetch bookings" });
      return;
    }

    const busyStaffIds = new Set<string>();
    for (const booking of existingBookings || []) {
      if (timesOverlap(requestedStart, requestedEnd, booking.start_time, booking.end_time)) {
        busyStaffIds.add(booking.staff_id);
      }
    }

    const availableStaff = (staff || []).filter((s) => !busyStaffIds.has(s.id));

    res.json(availableStaff);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to check staff availability: ${err.message}` });
  }
});

bookingRouter.get("/salon", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status } = req.query;
    const supabase = getSupabaseServerClient();

    console.log("[BOOKINGS/SALON] User:", user.id);

    const { data: salons, error: salonsErr } = await supabase
      .from("salons")
      .select("id, name")
      .eq("owner_id", user.id);

    if (salonsErr) {
      console.error("[BOOKINGS/SALON] Salon lookup error:", salonsErr.message);
      res.status(500).json({ error: `Failed to lookup salons: ${salonsErr.message}` });
      return;
    }

    if (!salons || salons.length === 0) {
      console.log("[BOOKINGS/SALON] No salons found for user:", user.id);
      res.status(404).json({ error: "No salon found for this owner" });
      return;
    }

    const salonIds = salons.map((s) => s.id);
    console.log("[BOOKINGS/SALON] Salon IDs:", salonIds);

    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("*")
      .in("salon_id", salonIds)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (bookingsErr) {
      console.error("[BOOKINGS/SALON] Bookings query error:", bookingsErr.message);
      res.status(500).json({ error: `Failed to fetch bookings: ${bookingsErr.message}` });
      return;
    }

    console.log("[BOOKINGS/SALON] Found", (bookings ?? []).length, "bookings");

    if (!bookings || bookings.length === 0) {
      res.json([]);
      return;
    }

    const userIds = [...new Set(bookings.map((b: any) => b.user_id).filter(Boolean))];
    const staffIds = [...new Set(bookings.map((b: any) => b.staff_id).filter(Boolean))];
    const bookingIds = bookings.map((b: any) => b.id);

    const [profilesRes, staffRes, servicesRes, paymentsRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, phone").in("id", userIds)
        : { data: [], error: null },
      staffIds.length > 0
        ? supabase.from("salon_staff").select("id, name, role, avatar_url").in("id", staffIds)
        : { data: [], error: null },
      bookingIds.length > 0
        ? supabase.from("booking_services").select("id, booking_id, service_id, service_name, price").in("booking_id", bookingIds)
        : { data: [], error: null },
      bookingIds.length > 0
        ? supabase.from("payments").select("id, booking_id, amount, status, payment_method, currency").in("booking_id", bookingIds)
        : { data: [], error: null },
    ]);

    if (profilesRes.error) console.error("[BOOKINGS/SALON] Profiles error:", profilesRes.error.message);
    if (staffRes.error) console.error("[BOOKINGS/SALON] Staff error:", staffRes.error.message);
    if (servicesRes.error) console.error("[BOOKINGS/SALON] Services error:", servicesRes.error.message);
    if (paymentsRes.error) console.error("[BOOKINGS/SALON] Payments error:", paymentsRes.error.message);

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

    const enriched = bookings.map((b: any) => ({
      ...b,
      user: profileMap.get(b.user_id) || null,
      staff: b.staff_id ? (staffMap.get(b.staff_id) || null) : null,
      booking_services: servicesByBooking.get(b.id) || [],
      payment: paymentByBooking.get(b.id) || null,
    }));

    let filtered = enriched;
    if (status && status !== "all") {
      filtered = enriched.filter((b: any) => b.status === status);
    }

    res.json(filtered);
  } catch (err: any) {
    console.error("[BOOKINGS/SALON] Unexpected error:", err);
    res.status(500).json({ error: `Failed to fetch salon bookings: ${err.message}` });
  }
});

bookingRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*, salon:salons(name, locality, cover_image, phone), booking_services(*), payment:payments(*), staff:salon_staff(id, name, role, avatar_url)")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to fetch bookings" });
      return;
    }

    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

bookingRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();
    const { id } = req.params;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*, salon:salons(name, address, locality, cover_image, phone, owner_id), booking_services(*), payment:payments(*), staff:salon_staff(id, name, role, avatar_url)")
      .eq("id", id)
      .single();

    if (error) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    const isOwner = booking.user_id === user.id;
    const isAdmin = role === "admin";
    const isSalonOwner = role === "salon_owner" && booking.salon?.owner_id === user.id;

    if (!isOwner && !isAdmin && !isSalonOwner) {
      res.status(403).json({ error: "Not authorized to view this booking" });
      return;
    }

    res.json(booking);
  } catch {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

bookingRouter.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const supabase = getSupabaseServerClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      pending: ["cancelled"],
      confirmed: ["cancelled"],
    };

    if (!allowedTransitions[existing.status]?.includes(status)) {
      res.status(400).json({ error: `Cannot transition from "${existing.status}" to "${status}"` });
      return;
    }

    const updateData: Record<string, any> = { status };
    if (status === "cancelled" && (existing.status === "pending" || existing.status === "confirmed")) {
      updateData.cancellation_reason = cancellationReason || null;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateErr) {
      res.status(500).json({ error: "Failed to update booking status" });
      return;
    }

    if (status === "cancelled" && existing.payment_status === "completed") {
      await supabase
        .from("payments")
        .update({ status: "refunded" })
        .eq("booking_id", id);
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update booking status" });
  }
});
