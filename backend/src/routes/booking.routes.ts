import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createAppointmentService,
  getUserAppointmentsService,
  updateAppointmentStatusService,
} from "../services/appointment.service";

export const bookingRouter = Router();

bookingRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const { serviceName, appointmentDate } = req.body;
    const appointment = await createAppointmentService(
      req as any,
      serviceName,
      appointmentDate,
    );
    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to create booking" });
    }
  }
});

bookingRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const appointments = await getUserAppointmentsService(req as any);
    res.json(appointments);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  }
});

bookingRouter.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await updateAppointmentStatusService(
      req as any,
      req.params.id,
      status,
    );
    res.json(appointment);
  } catch (error) {
    if (error instanceof Response) {
      res.status(error.status).json({ error: "Unauthorized" });
    } else {
      res.status(500).json({ error: "Failed to update booking" });
    }
  }
});
