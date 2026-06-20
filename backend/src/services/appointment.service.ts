import { getUserFromRequest } from "../integrations/supabase/auth";
import {
  createAppointment,
  getUserAppointments,
  updateAppointmentStatus,
} from "../repositories/appointment.repository";
import { UnauthorizedError } from "@glamspot/shared/schemas";
import type { Appointment } from "@glamspot/shared/types";

export async function createAppointmentService(
  request: Request,
  serviceName: string,
  appointmentDate: string,
): Promise<Appointment> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to book an appointment.");
  }

  return createAppointment(user.id, serviceName, appointmentDate);
}

export async function getUserAppointmentsService(
  request: Request,
): Promise<Appointment[]> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to view appointments.");
  }

  return getUserAppointments(user.id);
}

export async function updateAppointmentStatusService(
  request: Request,
  appointmentId: string,
  status: Appointment["status"],
): Promise<Appointment> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new UnauthorizedError("You must be signed in to update appointments.");
  }

  return updateAppointmentStatus(appointmentId, user.id, status);
}
