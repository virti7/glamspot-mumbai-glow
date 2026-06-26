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
  payment_provider: string | null;
  payment_provider_payment_id: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
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
  owner_id?: string;
  owner?: { id: string; full_name: string; email: string } | null;
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
  cancelled_at: string | null;
  check_in_time: string | null;
  completed_time: string | null;
  salon: BookingSalon | null;
  booking_services: BookingService[];
  payment: BookingPayment | BookingPayment[] | null;
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

export interface BookingWithDetails extends Booking {}

export type CreateBookingResponse = Booking & {
  booking_services: BookingService[];
  payment: BookingPayment | null;
};

export interface AdminBookingListResponse {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminBookingStats {
  totalBookings: number;
  todayBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  inProgressBookings: number;
  noShowBookings: number;
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  platformFees: number;
  averageBookingValue: number;
  averageRevenuePerSalon: number;
  averageRevenuePerCustomer: number;
  refundAmount: number;
  pendingPaymentAmount: number;
  completedPayments: number;
  cancelledPayments: number;
  refundedPayments: number;
  paymentSuccessRate: number;
  paymentFailureRate: number;
  uniqueCustomers: number;
  uniqueSalons: number;
  returningCustomers: number;
  newCustomers: number;
}

export interface AdminBookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  salon_id?: string;
  payment_status?: string;
  source?: string;
  payment_method?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface AdminAnalytics {
  period: string;
  overview: {
    totalBookings: number;
    totalRevenue: number;
    totalPlatformFees: number;
    totalRefunds: number;
    averageBookingValue: number;
    averageDuration: number;
    paymentSuccessRate: number;
    cancellationRate: number;
    refundRate: number;
    repeatCustomers: number;
    newCustomers: number;
  };
  charts: {
    revenueTrend: Array<{ date: string; value: number }>;
    bookingTrend: Array<{ date: string; value: number }>;
    platformFeeTrend: Array<{ date: string; value: number }>;
    userGrowth: Array<{ date: string; value: number }>;
    salonGrowth: Array<{ date: string; value: number }>;
    reviewGrowth: Array<{ date: string; value: number }>;
  };
  distributions: {
    bookingStatus: Array<{ status: string; count: number }>;
    bookingSource: Array<{ source: string; count: number }>;
    paymentMethod: Array<{ method: string; count: number }>;
    paymentStatus: Array<{ status: string; count: number }>;
  };
  topServices: Array<{ name: string; count: number }>;
  topSalons: Array<{ salon_id: string; name: string; bookings: number; revenue: number }>;
  peakHours: Array<{ hour: string; count: number }>;
  peakDays: Array<{ day: string; count: number }>;
}

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

  adminGetAll: (filters?: AdminBookingFilters) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    if (filters?.salon_id) params.set("salon_id", filters.salon_id);
    if (filters?.payment_status) params.set("payment_status", filters.payment_status);
    if (filters?.source) params.set("source", filters.source);
    if (filters?.payment_method) params.set("payment_method", filters.payment_method);
    const qs = params.toString();
    return api.get<AdminBookingListResponse>(`/admin/bookings${qs ? `?${qs}` : ""}`);
  },

  adminGetStats: () => api.get<AdminBookingStats>("/admin/bookings/stats"),

  adminGetAnalytics: (period: string = "30d") =>
    api.get<AdminAnalytics>(`/admin/bookings/analytics?period=${period}`),

  adminUpdateStatus: (id: string, status: string, data?: { cancellation_reason?: string }) =>
    api.put<Booking>(`/admin/bookings/${id}/status`, { status, ...data }),

  adminRefund: (id: string, refundAmount?: number, refundReason?: string) =>
    api.put<Booking>(`/admin/bookings/${id}/refund`, { refund_amount: refundAmount, refund_reason: refundReason }),

  adminReschedule: (id: string, data: { booking_date: string; start_time: string; end_time: string; reason?: string }) =>
    api.put<Booking>(`/admin/bookings/${id}/reschedule`, data),

  adminExport: (format: string = "csv", filters?: AdminBookingFilters) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.date_from) params.set("date_from", filters.date_from);
    if (filters?.date_to) params.set("date_to", filters.date_to);
    if (filters?.salon_id) params.set("salon_id", filters.salon_id);
    if (filters?.payment_status) params.set("payment_status", filters.payment_status);
    if (filters?.source) params.set("source", filters.source);
    return api.get<string>(`/admin/bookings/export?${params.toString()}`);
  },

  adminExportCsv: () => api.get<string>("/admin/bookings/export?format=csv"),
};
