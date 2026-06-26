import { api } from "./api";

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  service_name: string;
  price: number;
  duration_min: number;
}

export interface BookingPayment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

export interface BookingStaff {
  id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
}

export interface BookingSalon {
  id: string;
  name: string;
  slug: string;
  locality: string;
  address: string | null;
  cover_image: string | null;
  phone: string | null;
  city: string;
}

export interface BookingCustomer {
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

export interface Booking {
  id: string;
  user_id: string;
  salon_id: string;
  staff_id: string | null;
  assigned_staff_id: string | null;
  status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_duration_min: number;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  platform_fee: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  special_request: string | null;
  booking_reference: string | null;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  booking_source: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  salon: BookingSalon | null;
  booking_services: BookingService[];
  payment: BookingPayment | null;
  staff: BookingStaff | null;
  user: BookingCustomer | null;
}

export interface CreateBookingInput {
  salonId: string;
  services: Array<{
    serviceId: string;
    name: string;
    price: number;
    durationMin: number;
    discountedPrice?: number | null;
  }>;
  bookingDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequest?: string;
  staffId?: string;
  paymentMethod?: string;
}

export interface AvailableSlot {
  time: string;
  available: boolean;
  label?: string;
}

export interface AvailableDate {
  date: string;
  available: boolean;
  reason: string;
  available_slots: number;
}

export interface StaffAvailability {
  id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
  available: boolean;
}

export interface BookingStatusUpdate {
  status: string;
  cancellation_reason?: string;
  staff_id?: string;
}

export interface BookingWithDetails extends Booking {
  // full expanded type
}

export type CreateBookingResponse = Booking & {
  booking_services: BookingService[];
  payment: BookingPayment | null;
};

export const bookingService = {
  create: (data: CreateBookingInput) =>
    api.post<CreateBookingResponse>("/bookings", data),

  getMyBookings: () => api.get<Booking[]>("/bookings"),

  getById: (id: string) => api.get<Booking>(`/bookings/${id}`),

  updateStatus: (id: string, status: string, data?: { cancellation_reason?: string }) =>
    api.put<Booking>(`/bookings/${id}/status`, { status, ...data }),

  getSalonBookings: (status?: string) => {
    const params = status ? `?status=${status}` : "";
    return api.get<Booking[]>(`/bookings/salon${params}`);
  },

  getAvailableSlots: (salonId: string, date: string, staffId?: string, duration?: number) => {
    let params = `?salonId=${salonId}&date=${date}&duration=${duration || 30}`;
    if (staffId) params += `&staffId=${staffId}`;
    return api.get<AvailableSlot[]>(`/bookings/available-slots${params}`);
  },

  getAvailableDates: (salonId: string, month: string) =>
    api.get<AvailableDate[]>(`/bookings/available-dates?salonId=${salonId}&month=${month}`),

  getStaffAvailability: (salonId: string, date: string, time: string, durationMin: number) =>
    api.get<StaffAvailability[]>(`/bookings/salon/staff-availability?salonId=${salonId}&date=${date}&time=${time}&durationMin=${durationMin}`),

  ownerUpdateStatus: (id: string, data: BookingStatusUpdate) =>
    api.put<Booking>(`/salon-management/bookings/${id}/status`, data),

  assignStaff: (id: string, staffId: string) =>
    api.put<Booking>(`/salon-management/bookings/${id}/staff`, { staff_id: staffId }),

  adminGetAll: (status?: string) => {
    const params = status ? `?status=${status}` : "";
    return api.get<Booking[]>(`/admin/bookings${params}`);
  },

  adminUpdateStatus: (id: string, status: string, data?: { cancellation_reason?: string }) =>
    api.put<Booking>(`/admin/bookings/${id}/status`, { status, ...data }),

  adminRefund: (id: string, refundAmount?: number) =>
    api.put<Booking>(`/admin/bookings/${id}/refund`, { refund_amount: refundAmount }),

  adminExportCsv: () => api.get<string>("/admin/bookings/export"),
};
