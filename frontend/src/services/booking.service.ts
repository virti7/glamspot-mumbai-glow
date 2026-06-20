import { api } from "./api";

export interface Booking {
  id: string;
  user_id: string;
  salon_id: string;
  status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  salon: {
    name: string;
    locality: string;
    cover_image: string | null;
  } | null;
  booking_services?: Array<{
    id: string;
    service_name: string;
    price: number;
  }>;
}

export interface CreateBookingInput {
  salonId: string;
  serviceId: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
}

export const bookingService = {
  create: (data: CreateBookingInput) =>
    api.post<Booking>("/bookings", data),

  getMyBookings: () => api.get<Booking[]>("/bookings"),

  updateStatus: (id: string, status: string) =>
    api.put<Booking>(`/bookings/${id}/status`, { status }),

  getSalonBookings: () => api.get<Booking[]>("/bookings/salon"),
};
