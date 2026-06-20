import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getSupabaseServerClient } from "../integrations/supabase/client";

export const bookingRouter = Router();

bookingRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { salonId, serviceId, bookingDate, bookingTime, notes } = req.body;

    if (!salonId || !bookingDate || !bookingTime) {
      res.status(400).json({ error: "salonId, bookingDate, and bookingTime are required" });
      return;
    }

    const supabase = getSupabaseServerClient();

    const { data: service, error: svcError } = await supabase
      .from("salon_services")
      .select("id, name, price, duration_minutes")
      .eq("id", serviceId)
      .single();

    if (svcError) {
      res.status(400).json({ error: "Invalid service" });
      return;
    }

    const startTime = bookingTime;
    const [hours, minutes] = bookingTime.match(/(\d+):(\d+)/)?.slice(1) ?? ["0", "0"];
    const isPM = bookingTime.includes("PM");
    let h = parseInt(hours);
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    const endMinutes = h * 60 + parseInt(minutes) + (service.duration_minutes || 60);
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        salon_id: salonId,
        status: "pending",
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        total_duration_min: service.duration_minutes || 60,
        total_amount: service.price,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: `Failed to create booking: ${error.message}` });
      return;
    }

    if (serviceId) {
      await supabase.from("booking_services").insert({
        booking_id: booking.id,
        service_id: serviceId,
        service_name: service.name,
        price: service.price,
      });
    }

    res.status(201).json(booking);
  } catch {
    res.status(500).json({ error: "Failed to create booking" });
  }
});

bookingRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("bookings")
      .select("*, salon:salons(name, locality, cover_image), booking_services(*)")
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

bookingRouter.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", req.params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to update booking" });
      return;
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to update booking" });
  }
});

bookingRouter.get("/salon", authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const supabase = getSupabaseServerClient();

    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!salon) {
      res.status(404).json({ error: "No salon found for this owner" });
      return;
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*, user:profiles(full_name, phone, email), booking_services(*)")
      .eq("salon_id", salon.id)
      .order("booking_date", { ascending: false });

    if (error) {
      res.status(500).json({ error: "Failed to fetch salon bookings" });
      return;
    }

    res.json(data ?? []);
  } catch {
    res.status(500).json({ error: "Failed to fetch salon bookings" });
  }
});
