"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking } from "@/services/booking.service";
import { getAccessToken } from "@/lib/auth";
import { supabaseClient } from "@/lib/auth";
import { DashboardHeader } from "@/components/DashboardHeader";
import {
  Search, Calendar, Clock, User, Phone, DollarSign, Check, X,
  AlertCircle, CalendarCheck, Loader2, CreditCard, FileText,
  RefreshCw, Mail,
} from "lucide-react";

const statusTabs = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  checked_in: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  no_show: "bg-gray-50 text-gray-700 border-gray-200",
};

const paymentColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-600 border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${paymentColors[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {status}
    </span>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 animate-pulse">
          <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function SalonBookingsPage() {
  const { loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await bookingService.getSalonBookings(statusFilter || undefined);
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load bookings";
      console.error("[SalonBookings] Fetch error:", msg);
      setError(msg);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!authLoading) fetchBookings();
  }, [authLoading, fetchBookings]);

  useEffect(() => {
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  useEffect(() => {
    try {
      const channel = supabaseClient
        ?.channel("salon-bookings-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
          fetchBookings();
        })
        .subscribe();
      return () => {
        if (channel) supabaseClient?.removeChannel(channel);
      };
    } catch {
      return () => {};
    }
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const name = b.user?.full_name?.toLowerCase() || b.customer_name?.toLowerCase() || "";
        const phone = b.user?.phone?.toLowerCase() || b.customer_phone?.toLowerCase() || "";
        const ref = b.booking_reference?.toLowerCase() || "";
        const services = b.booking_services?.map((s) => s.service_name?.toLowerCase()).join(" ") || "";
        return name.includes(q) || phone.includes(q) || ref.includes(q) || services.includes(q);
      });
    }

    if (dateFilter) {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      if (dateFilter === "today") {
        result = result.filter((b) => b.booking_date === today);
      } else if (dateFilter === "tomorrow") {
        result = result.filter((b) => b.booking_date === tomorrow);
      } else if (dateFilter === "upcoming") {
        result = result.filter((b) => b.booking_date >= today && b.status !== "cancelled");
      } else if (dateFilter === "past") {
        result = result.filter((b) => b.booking_date < today);
      }
    }

    return result;
  }, [bookings, searchQuery, dateFilter]);

  const todayStr = new Date().toISOString().split("T")[0];
  const totalBookings = bookings.length;
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr).length;
  const upcomingBookings = bookings.filter((b) => b.booking_date >= todayStr && b.status !== "cancelled").length;
  const pendingConfirmations = bookings.filter((b) => b.status === "pending").length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
  const revenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const handleSimpleStatus = async (booking: Booking, newStatus: string) => {
    try {
      await bookingService.ownerUpdateStatus(booking.id, { status: newStatus });
      fetchBookings();
    } catch (err: any) {
      setError(err?.message || "Failed to update status");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await bookingService.ownerUpdateStatus(cancelTarget.id, {
        status: "cancelled",
        cancellation_reason: cancelReason,
      });
      setCancelTarget(null);
      setCancelReason("");
      fetchBookings();
    } catch (err: any) {
      setError(err?.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <DashboardHeader />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[#111827] text-2xl md:text-3xl font-bold">Bookings</h1>
          <p className="text-[#6B7280] text-sm mt-1">Manage your appointments</p>
        </div>
        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#FAFAFB] transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? <SkeletonCards /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase">Total</span>
              <CalendarCheck size={15} className="text-[#EC4899]" />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{totalBookings}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase">Today</span>
              <Calendar size={15} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{todayBookings}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase">Upcoming</span>
              <Clock size={15} className="text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{upcomingBookings}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase">Pending</span>
              <AlertCircle size={15} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{pendingConfirmations}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase">Completed</span>
              <Check size={15} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-[#111827]">{completedBookings}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase">Revenue</span>
              <DollarSign size={15} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-[#111827]">₹{revenue.toLocaleString("en-IN")}</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex overflow-x-auto gap-1 pb-1 md:pb-0 scrollbar-none">
              {statusTabs.map((tab) => {
                const count = tab.value
                  ? bookings.filter((b) => b.status === tab.value).length
                  : bookings.length;
                const isActive = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-[#EC4899] text-white shadow-sm"
                        : "bg-white text-[#6B7280] border border-[#E5E7EB]/60 hover:border-[#EC4899]/30 hover:text-[#111827]"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E5E7EB]/60 text-[13px] text-[#111827] bg-white focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] outline-none"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
              <div className="relative w-full md:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search name, ref, phone, service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E7EB]/60 text-sm text-[#111827] bg-white focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] placeholder:text-[#9CA3AF] outline-none"
                />
              </div>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-12 text-center">
              <CalendarCheck size={40} className="mx-auto text-[#D1D5DB] mb-3" />
              <p className="text-[#111827] font-semibold text-[15px]">
                {bookings.length === 0 ? "No bookings yet" : "No bookings found"}
              </p>
              <p className="text-[#6B7280] text-[13px] mt-1">
                {bookings.length === 0
                  ? "Bookings will appear here once customers start booking"
                  : searchQuery || dateFilter
                    ? "Try adjusting your search or filters"
                    : "No bookings match the selected filter"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]/60 bg-[#F3F4F6]">
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Ref</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Customer</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Services</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Date & Time</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Amount</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Payment</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Status</th>
                      <th className="text-left p-4 text-[11px] font-semibold text-[#6B7280] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b border-[#E5E7EB]/60 hover:bg-[#FAFAFB] cursor-pointer transition-colors"
                        onClick={() => setDetailTarget(booking)}
                      >
                        <td className="p-4 text-[13px] font-mono font-medium text-[#EC4899]">
                          {booking.booking_reference || `GS-${booking.id.slice(0, 6).toUpperCase()}`}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-[#9CA3AF]" />
                            <span className="text-[13px] text-[#111827] font-medium">
                              {booking.user?.full_name || booking.customer_name || "Customer"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-0.5 ml-[22px]">
                            <Phone size={10} />
                            {booking.user?.phone || booking.customer_phone || "—"}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[13px] text-[#111827]">
                            {booking.booking_services?.length
                              ? booking.booking_services.map((s) => s.service_name).join(", ")
                              : "—"}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[13px] text-[#111827]">
                            <Calendar size={12} className="text-[#9CA3AF]" />
                            {new Date(booking.booking_date).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280] mt-0.5 ml-[18px]">
                            <Clock size={11} className="text-[#9CA3AF]" />
                            {booking.start_time} - {booking.end_time}
                          </div>
                        </td>
                        <td className="p-4 text-[13px] font-medium text-[#111827]">
                          ₹{(booking.total_amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4">
                          <PaymentBadge status={booking.payment_status || "pending"} />
                        </td>
                        <td className="p-4">
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          {booking.status === "pending" && (
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleSimpleStatus(booking, "confirmed")}
                                className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-medium border border-green-200 hover:bg-green-100 transition-all flex items-center gap-1"
                              >
                                <Check size={12} /> Confirm
                              </button>
                              <button
                                onClick={() => { setCancelTarget(booking); setCancelReason(""); }}
                                className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-medium border border-red-200 hover:bg-red-100 transition-all flex items-center gap-1"
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          )}
                          {booking.status === "confirmed" && (
                            <div className="flex gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleSimpleStatus(booking, "checked_in")}
                                className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1"
                              >
                                <Check size={12} /> Check In
                              </button>
                              <button
                                onClick={() => { setCancelTarget(booking); setCancelReason(""); }}
                                className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-medium border border-red-200 hover:bg-red-100 transition-all flex items-center gap-1"
                              >
                                <X size={12} /> Cancel
                              </button>
                            </div>
                          )}
                          {booking.status === "checked_in" && (
                            <button
                              onClick={() => handleSimpleStatus(booking, "in_progress")}
                              className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200 hover:bg-purple-100 transition-all flex items-center gap-1"
                            >
                              Start Service
                            </button>
                          )}
                          {booking.status === "in_progress" && (
                            <button
                              onClick={() => handleSimpleStatus(booking, "completed")}
                              className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[11px] font-medium border border-green-200 hover:bg-green-100 transition-all flex items-center gap-1"
                            >
                              Complete
                            </button>
                          )}
                          {booking.status === "completed" && (
                            <span className="text-[12px] text-[#9CA3AF] font-medium">Done</span>
                          )}
                          {booking.status === "cancelled" && (
                            <span className="text-[12px] text-red-400">Cancelled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCancelTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[#111827] text-lg font-bold">Cancel Booking</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF]">
                <X size={18} />
              </button>
            </div>
            <p className="text-[14px] text-[#6B7280] mb-4">
              Cancel booking <strong>{cancelTarget.booking_reference || `GS-${cancelTarget.id.slice(0, 6).toUpperCase()}`}</strong>?
            </p>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Cancellation Reason</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Provide a reason..."
                className="w-full rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] py-2.5 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCancelTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all">
                Keep
              </button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {cancelling && <Loader2 size={14} className="animate-spin" />}
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-[#111827] text-lg font-bold">
                  Booking {detailTarget.booking_reference || `GS-${detailTarget.id.slice(0, 6).toUpperCase()}`}
                </h3>
                <span className="mt-1 inline-block"><StatusBadge status={detailTarget.status} /></span>
              </div>
              <button onClick={() => setDetailTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF]">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-[#FAFAFB] rounded-xl p-4">
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Customer</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[13px]">
                    <User size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.user?.full_name || detailTarget.customer_name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Phone size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.user?.phone || detailTarget.customer_phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Mail size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.user?.email || detailTarget.customer_email || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFAFB] rounded-xl p-4">
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Booking Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[13px]">
                    <Calendar size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">
                      {new Date(detailTarget.booking_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Clock size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.start_time} - {detailTarget.end_time} ({detailTarget.total_duration_min || "—"} min)</span>
                  </div>
                  {detailTarget.special_request && (
                    <div className="flex items-start gap-2 text-[13px]">
                      <FileText size={14} className="text-[#9CA3AF] mt-0.5" />
                      <span className="text-[#111827]">{detailTarget.special_request}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Selected Services</h4>
              <div className="bg-[#FAFAFB] rounded-xl divide-y divide-[#E5E7EB]/60">
                {detailTarget.booking_services?.length ? detailTarget.booking_services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[14px] text-[#111827]">{svc.service_name}</span>
                    <span className="text-[14px] font-medium text-[#111827]">₹{(svc.price || 0).toLocaleString("en-IN")}</span>
                  </div>
                )) : (
                  <div className="px-4 py-3 text-[13px] text-[#9CA3AF]">No services recorded</div>
                )}
                <div className="flex items-center justify-between px-4 py-3 bg-white/50">
                  <span className="text-[14px] font-semibold text-[#111827]">Total</span>
                  <span className="text-[15px] font-bold text-[#111827]">₹{(detailTarget.total_amount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
              <div>
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Payment</h4>
                <div className="bg-[#FAFAFB] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-[#9CA3AF]" />
                      <span className="text-[13px] text-[#111827]">{detailTarget.payment_method || "—"}</span>
                    </div>
                    <PaymentBadge status={detailTarget.payment_status || "pending"} />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Timeline</h4>
                <div className="bg-[#FAFAFB] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                    <Clock size={14} />
                    Created: {new Date(detailTarget.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                    <Clock size={14} />
                    Updated: {new Date(detailTarget.updated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  {detailTarget.cancellation_reason && (
                    <div className="flex items-start gap-2 text-[13px] text-red-600">
                      <AlertCircle size={14} className="mt-0.5" />
                      Cancelled: {detailTarget.cancellation_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              {detailTarget.status === "pending" && (
                <>
                  <button onClick={() => { handleSimpleStatus(detailTarget, "confirmed"); setDetailTarget(null); }} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-1.5">
                    <Check size={14} /> Confirm
                  </button>
                  <button onClick={() => { setCancelTarget(detailTarget); setCancelReason(""); setDetailTarget(null); }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all">
                    Cancel
                  </button>
                </>
              )}
              <button onClick={() => setDetailTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
