import { getSupabaseServerClient } from "../integrations/supabase/client";
import { AppError } from "@glamspot/shared/schemas";
import type { Appointment } from "@glamspot/shared/types";

export async function createAppointment(
  userId: string,
  serviceName: string,
  appointmentDate: string,
): Promise<Appointment> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: userId,
      service_name: serviceName,
      appointment_date: appointmentDate,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError(`Failed to create appointment: ${error.message}`, "DB_ERROR", 500);
  }

  return data as Appointment;
}

export async function getUserAppointments(userId: string): Promise<Appointment[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("appointment_date", { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch appointments: ${error.message}`, "DB_ERROR", 500);
  }

  return (data ?? []) as Appointment[];
}

export async function updateAppointmentStatus(
  appointmentId: string,
  userId: string,
  status: Appointment["status"],
): Promise<Appointment> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new AppError(`Failed to update appointment: ${error.message}`, "DB_ERROR", 500);
  }

  return data as Appointment;
}
