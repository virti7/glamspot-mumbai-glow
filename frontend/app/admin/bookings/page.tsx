"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  bookingService,
  type Booking,
  type AdminBookingListResponse,
  type AdminBookingStats,
} from "@/services/booking.service";
import { getAccessToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Calendar, CalendarCheck, Clock, DollarSign, Search, Loader2, Shield,
  User, Store, Phone, X as XIcon, CheckCircle, AlertCircle, CreditCard,
  UserPlus, RefreshCw, Download, MoreHorizontal, Eye, Edit3, Ban, Undo,
  TrendingUp, FileText, ChevronLeft, ChevronRight, Filter, XCircle,
  CalendarClock, CheckSquare, Users, Star, ArrowDownRight, Send,
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
  no_show: "bg-gray-50 text-gray-600 border-gray-200",
};

const paymentColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-600 border-gray-200",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize inline-block ${statusColors[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-block ${paymentColors[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {status}
    </span>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 animate-pulse">
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
      <div className="p-12 flex items-center justify-center">
        <Loader2 size={24} className="text-gray-300 animate-spin" />
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminBookingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [salonFilter, setSalonFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [salons, setSalons] = useState<{ id: string; name: string }[]>([]);

  const [detailTarget, setDetailTarget] = useState<Booking | null>(null);
  const [statusTarget, setStatusTarget] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [assignTarget, setAssignTarget] = useState<Booking | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; name: string; role: string | null }[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const filters = useMemo<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    if (searchQuery) f.search = searchQuery;
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    if (paymentStatusFilter) f.payment_status = paymentStatusFilter;
    if (sourceFilter) f.source = sourceFilter;
    if (salonFilter) f.salon_id = salonFilter;
    return f;
  }, [statusFilter, searchQuery, dateFrom, dateTo, paymentStatusFilter, sourceFilter, salonFilter]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await bookingService.adminGetAll({ ...filters, page, limit: 20 });
      setBookings(result.bookings);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e: any) {
      const msg = e?.message || "Failed to load bookings";
      console.error("[Admin Bookings] Fetch error:", e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await bookingService.adminGetStats();
      setStats(result);
    } catch (e: any) {
      console.error("[Admin Bookings] Stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchBookings();
      fetchStats();
    }
  }, [profile, fetchBookings, fetchStats]);

  useEffect(() => {
    const channel = supabase.channel("admin-bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchBookings();
        fetchStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings, fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, dateFrom, dateTo, paymentStatusFilter, sourceFilter, salonFilter]);

  useEffect(() => {
    fetch("/api/admin/salons", { headers: { Authorization: `Bearer ${getAccessToken()}` } })
      .then(r => r.json())
      .then((data: any) => { if (Array.isArray(data)) setSalons(data.map((s: any) => ({ id: s.id, name: s.name }))); })
      .catch(() => {});
  }, []);

  const isRevenueBooking = (b: Booking) => {
    const src = (b.booking_source || "").toLowerCase();
    const ps = (b.payment_status || "").toLowerCase();
    const st = (b.status || "").toLowerCase();
    return (src === "website" || src === "glamspot") && (ps === "paid" || ps === "completed") && st !== "cancelled" && st !== "no_show" && st !== "refunded";
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await bookingService.adminExport(exportFormat, {
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        salon_id: salonFilter || undefined,
        payment_status: paymentStatusFilter || undefined,
        source: sourceFilter || undefined,
      });
      const ext = exportFormat === "excel" ? "xls" : "csv";
      const mime = exportFormat === "excel" ? "application/vnd.ms-excel" : "text/csv";
      const blob = new Blob([result], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-export-${new Date().toISOString().split("T")[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${exportFormat.toUpperCase()} exported successfully`);
    } catch {
      toast.error("Failed to export");
    } finally {
      setExporting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await bookingService.adminUpdateStatus(statusTarget.id, newStatus);
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
      setStatusTarget(null);
      setNewStatus("");
      fetchBookings();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await bookingService.adminUpdateStatus(cancelTarget.id, "cancelled", { cancellation_reason: cancelReason });
      toast.success("Booking cancelled");
      setCancelTarget(null);
      setCancelReason("");
      fetchBookings();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      await bookingService.adminRefund(refundTarget.id, amount, refundReason || undefined);
      toast.success("Refund processed successfully");
      setRefundTarget(null);
      setRefundAmount("");
      setRefundReason("");
      fetchBookings();
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Failed to process refund");
    } finally {
      setRefunding(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleStart || !rescheduleEnd) return;
    setRescheduling(true);
    try {
      await bookingService.adminReschedule(rescheduleTarget.id, {
        booking_date: rescheduleDate,
        start_time: rescheduleStart,
        end_time: rescheduleEnd,
        reason: rescheduleReason || undefined,
      });
      toast.success("Booking rescheduled");
      setRescheduleTarget(null);
      setRescheduleDate("");
      setRescheduleStart("");
      setRescheduleEnd("");
      setRescheduleReason("");
      fetchBookings();
    } catch (e: any) {
      toast.error(e.message || "Failed to reschedule");
    } finally {
      setRescheduling(false);
    }
  };

  const openAssignStaff = async (booking: Booking) => {
    setAssignTarget(booking);
    setStaffLoading(true);
    try {
      const res = await fetch(`/api/admin/salons/${booking.salon_id}/staff`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      setStaffList([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      await bookingService.assignStaff(assignTarget.id, staffId);
      toast.success("Staff assigned successfully");
      setAssignTarget(null);
      fetchBookings();
    } catch {
      toast.error("Failed to assign staff");
    } finally {
      setAssigning(false);
    }
  };

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-[22px] font-bold text-[#111827] mb-2">Access Denied</h2>
          <p className="text-[14px] text-[#6B7280]">Admin Only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Bookings</h1>
          <p className="text-sm text-[#6B7280]">{total} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-[#E5E7EB] bg-white text-[13px] text-[#374151] appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#EC4899]/20">
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <button onClick={handleExport} disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#FAFAFB] transition-all disabled:opacity-50 cursor-pointer">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
          <button onClick={() => { fetchBookings(); fetchStats(); }} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#FAFAFB] transition-all disabled:opacity-50 cursor-pointer">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {statsLoading ? (
        <SkeletonCards />
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: "Total Bookings", value: stats.totalBookings, icon: CalendarCheck, color: "#EC4899", bg: "bg-pink-50" },
            { label: "Today's Bookings", value: stats.todayBookings, icon: Calendar, color: "#3B82F6", bg: "bg-blue-50" },
            { label: "Pending", value: stats.pendingBookings, icon: Clock, color: "#F59E0B", bg: "bg-amber-50" },
            { label: "Completed", value: stats.completedBookings, icon: CheckCircle, color: "#22C55E", bg: "bg-green-50" },
            { label: "Revenue Today", value: `₹${stats.todayRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "#8B5CF6", bg: "bg-purple-50" },
            { label: "Revenue Month", value: `₹${stats.monthRevenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "#10B981", bg: "bg-emerald-50" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{card.label}</span>
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon size={16} style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#111827]">{card.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex overflow-x-auto gap-1 pb-1 md:pb-0 scrollbar-none">
          {statusTabs.map((tab) => {
            const count = tab.value ? bookings.filter((b) => b.status === tab.value).length : total;
            const isActive = statusFilter === tab.value;
            return (
              <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive ? "bg-[#EC4899] text-white shadow-sm" : "bg-white text-[#6B7280] border border-[#E5E7EB]/60 hover:border-[#EC4899]/30 hover:text-[#111827]"
                }`}>
                {tab.label}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input type="text" placeholder="Search ref, customer, salon, email, phone..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E7EB]/60 text-sm text-[#111827] bg-white focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] placeholder:text-[#9CA3AF] outline-none" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border text-[13px] font-medium transition-all cursor-pointer ${
              showFilters ? "bg-[#EC4899] text-white border-[#EC4899]" : "bg-white text-[#6B7280] border-[#E5E7EB]/60 hover:border-[#EC4899]/30"
            }`}>
            <Filter size={14} />
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Date From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-[12px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Date To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-[12px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Salon</label>
              <select value={salonFilter} onChange={(e) => setSalonFilter(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-[12px] outline-none bg-white focus:ring-2 focus:ring-[#EC4899]/20">
                <option value="">All Salons</option>
                {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Payment Status</label>
              <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-[12px] outline-none bg-white focus:ring-2 focus:ring-[#EC4899]/20">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Source</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#E5E7EB] px-3 text-[12px] outline-none bg-white focus:ring-2 focus:ring-[#EC4899]/20">
                <option value="">All</option>
                <option value="website">Website</option>
                <option value="glamspot">GlamSpot</option>
                <option value="walk_in">Walk-in</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setDateFrom(""); setDateTo(""); setSalonFilter(""); setPaymentStatusFilter(""); setSourceFilter(""); }}
                className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-[12px] text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable />
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-12 text-center">
          <CalendarCheck size={40} className="mx-auto text-[#D1D5DB] mb-3" />
          <p className="text-[#111827] font-semibold text-[15px]">No bookings found</p>
          <p className="text-[#6B7280] text-[13px] mt-1">
            {searchQuery ? "Try a different search term" : "No bookings match the selected filters"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]/60 bg-[#F3F4F6] sticky top-0">
                    {["Ref #", "Customer", "Salon", "Services", "Date & Time", "Amount", "Payment", "Status", "Source", "Actions"].map((h) => (
                      <th key={h} className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-[#E5E7EB]/60 hover:bg-[#FAFAFB] transition-colors cursor-pointer" onClick={() => setDetailTarget(booking)}>
                      <td className="p-4">
                        <span className="text-[13px] font-mono font-medium text-[#EC4899]">
                          {booking.booking_reference || `#${booking.id.slice(0, 8).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {(booking.user?.full_name || booking.customer_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#111827]">{booking.user?.full_name || booking.customer_name || "Guest"}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{booking.user?.phone || booking.customer_phone || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Store size={13} className="text-[#9CA3AF] flex-shrink-0" />
                          <span className="text-[13px] font-medium text-[#111827]">{booking.salon?.name || "—"}</span>
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
                          {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280] mt-0.5">
                          <Clock size={11} className="text-[#9CA3AF]" />
                          {booking.start_time} - {booking.end_time}
                        </div>
                      </td>
                      <td className="p-4 text-[14px] font-semibold text-[#111827] whitespace-nowrap">
                        ₹{booking.total_amount.toLocaleString("en-IN")}
                      </td>
                      <td className="p-4"><PaymentBadge status={booking.payment_status || "pending"} /></td>
                      <td className="p-4"><StatusBadge status={booking.status} /></td>
                      <td className="p-4">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] font-medium capitalize">
                          {booking.booking_source || "website"}
                        </span>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <BookingActionsDropdown
                            booking={booking}
                            onView={() => setDetailTarget(booking)}
                            onEditStatus={() => { setStatusTarget(booking); setNewStatus(booking.status); }}
                            onAssignStaff={() => openAssignStaff(booking)}
                            onCancel={() => { setCancelTarget(booking); setCancelReason(""); }}
                            onRefund={() => { setRefundTarget(booking); setRefundAmount(""); setRefundReason(""); }}
                            onReschedule={() => { setRescheduleTarget(booking); setRescheduleDate(booking.booking_date); setRescheduleStart(booking.start_time); setRescheduleEnd(booking.end_time); setRescheduleReason(""); }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-[13px] text-[#6B7280]">
                Page {page} of {totalPages} ({total} bookings)
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                  className="p-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#FAFAFB] disabled:opacity-40 cursor-pointer transition-all">
                  <ChevronLeft size={16} className="text-[#6B7280]" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[13px] font-medium cursor-pointer transition-all ${
                        page === pageNum ? "bg-[#EC4899] text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#FAFAFB]"
                      }`}>
                      {pageNum}
                    </button>
                  );
                })}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#FAFAFB] disabled:opacity-40 cursor-pointer transition-all">
                  <ChevronRight size={16} className="text-[#6B7280]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {detailTarget && <BookingDetailModal booking={detailTarget} onClose={() => setDetailTarget(null)} />}
      {statusTarget && (
        <ModalWrapper title="Edit Status" onClose={() => { setStatusTarget(null); setNewStatus(""); }}>
          <p className="text-[14px] text-[#6B7280] mb-4">
            Status for <strong>{statusTarget.booking_reference || `#${statusTarget.id.slice(0, 8).toUpperCase()}`}</strong>
          </p>
          <div className="mb-5">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">New Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]">
              {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setStatusTarget(null); setNewStatus(""); }}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer">Cancel</button>
            <button onClick={handleStatusUpdate} disabled={updatingStatus || newStatus === statusTarget.status}
              className="flex-1 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
              {updatingStatus && <Loader2 size={14} className="animate-spin" />} Update
            </button>
          </div>
        </ModalWrapper>
      )}

      {cancelTarget && (
        <ModalWrapper title="Cancel Booking" onClose={() => { setCancelTarget(null); setCancelReason(""); }}>
          <p className="text-[14px] text-[#6B7280] mb-4">
            Cancel booking <strong>{cancelTarget.booking_reference || `#${cancelTarget.id.slice(0, 8).toUpperCase()}`}</strong>?
          </p>
          <div className="mb-5">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Cancellation Reason *</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="Provide a reason..."
              className="w-full rounded-xl border border-[#E5E7EB] px-4 text-sm py-2.5 resize-none outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setCancelTarget(null); setCancelReason(""); }}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer">Keep</button>
            <button onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
              {cancelling && <Loader2 size={14} className="animate-spin" />} Cancel Booking
            </button>
          </div>
        </ModalWrapper>
      )}

      {refundTarget && (
        <ModalWrapper title="Process Refund" onClose={() => { setRefundTarget(null); setRefundAmount(""); setRefundReason(""); }}>
          <p className="text-[14px] text-[#6B7280] mb-1">Refund for <strong>{refundTarget.booking_reference || `#${refundTarget.id.slice(0, 8).toUpperCase()}`}</strong></p>
          <p className="text-[13px] text-[#6B7280] mb-4">Full amount: <strong>₹{refundTarget.total_amount.toLocaleString("en-IN")}</strong></p>
          <div className="mb-3">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Refund Amount (₹)</label>
            <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Leave empty for full refund"
              className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
          </div>
          <div className="mb-5">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Reason</label>
            <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Optional reason"
              className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRefundTarget(null); setRefundAmount(""); setRefundReason(""); }}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer">Cancel</button>
            <button onClick={handleRefund} disabled={refunding}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
              {refunding && <Loader2 size={14} className="animate-spin" />} Process Refund
            </button>
          </div>
        </ModalWrapper>
      )}

      {rescheduleTarget && (
        <ModalWrapper title="Reschedule Booking" onClose={() => { setRescheduleTarget(null); setRescheduleDate(""); setRescheduleStart(""); setRescheduleEnd(""); setRescheduleReason(""); }}>
          <p className="text-[14px] text-[#6B7280] mb-4">
            Reschedule <strong>{rescheduleTarget.booking_reference || `#${rescheduleTarget.id.slice(0, 8).toUpperCase()}`}</strong>
          </p>
          <div className="space-y-3 mb-5">
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">New Date *</label>
              <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Start Time *</label>
                <input type="time" value={rescheduleStart} onChange={(e) => setRescheduleStart(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">End Time *</label>
                <input type="time" value={rescheduleEnd} onChange={(e) => setRescheduleEnd(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Reason</label>
              <input type="text" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} placeholder="Optional"
                className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] outline-none focus:ring-2 focus:ring-[#EC4899]/20" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setRescheduleTarget(null); setRescheduleDate(""); setRescheduleStart(""); setRescheduleEnd(""); setRescheduleReason(""); }}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer">Cancel</button>
            <button onClick={handleReschedule} disabled={rescheduling || !rescheduleDate || !rescheduleStart || !rescheduleEnd}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
              {rescheduling && <Loader2 size={14} className="animate-spin" />} Reschedule
            </button>
          </div>
        </ModalWrapper>
      )}

      {assignTarget && (
        <ModalWrapper title="Assign Staff" onClose={() => { setAssignTarget(null); setStaffList([]); }}>
          <p className="text-[14px] text-[#6B7280] mb-4">
            Select staff for <strong>{assignTarget.booking_reference || `#${assignTarget.id.slice(0, 8).toUpperCase()}`}</strong>
          </p>
          {staffLoading ? (
            <div className="flex items-center justify-center py-8 text-[#6B7280]">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading staff...
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-center py-8 text-[#9CA3AF] text-[14px]">No staff members available</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto mb-5">
              {staffList.map((staff) => (
                <button key={staff.id} onClick={() => handleAssignStaff(staff.id)} disabled={assigning}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E7EB]/60 hover:border-[#EC4899]/30 hover:bg-[#FAFAFB] transition-all disabled:opacity-50 text-left cursor-pointer">
                  <div>
                    <p className="text-[14px] font-medium text-[#111827]">{staff.name}</p>
                    <p className="text-[12px] text-[#6B7280]">{staff.role || "Staff"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">Active</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setAssignTarget(null); setStaffList([]); }}
            className="w-full py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer">Cancel</button>
        </ModalWrapper>
      )}
    </div>
  );
}

function ModalWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#111827]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer"><XIcon size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const payment = Array.isArray(booking.payment) ? booking.payment[0] : booking.payment;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">
              Booking {booking.booking_reference || `#${booking.id.slice(0, 8).toUpperCase()}`}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={booking.status} />
              <PaymentBadge status={booking.payment_status || "pending"} />
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] font-medium capitalize">
                {booking.booking_source || "website"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer"><XIcon size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="bg-[#FAFAFB] rounded-xl p-4">
            <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Customer Details</h4>
            <div className="space-y-2">
              <Row icon={User} label={booking.user?.full_name || booking.customer_name || "—"} />
              <Row icon={Phone} label={booking.user?.phone || booking.customer_phone || "—"} />
              <Row icon={FileText} label={booking.user?.email || booking.customer_email || "—"} />
            </div>
          </div>
          <div className="bg-[#FAFAFB] rounded-xl p-4">
            <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Booking Details</h4>
            <div className="space-y-2">
              <Row icon={Store} label={`${booking.salon?.name || "—"}${booking.salon?.owner ? ` (${booking.salon.owner.full_name})` : ""}`} />
              <Row icon={Calendar} label={new Date(booking.booking_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} />
              <Row icon={Clock} label={`${booking.start_time} - ${booking.end_time} (${booking.total_duration_min} min)`} />
              <Row icon={UserPlus} label={booking.staff?.name || "Unassigned"} />
              {booking.special_request && <Row icon={FileText} label={booking.special_request} />}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Services</h4>
          <div className="bg-[#FAFAFB] rounded-xl divide-y divide-[#E5E7EB]/60">
            {booking.booking_services?.map((svc) => (
              <div key={svc.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-[14px] text-[#111827]">{svc.service_name}</span>
                  {svc.duration_min && <span className="text-[11px] text-[#9CA3AF] ml-2">({svc.duration_min} min)</span>}
                </div>
                <span className="text-[14px] font-medium text-[#111827]">₹{svc.price.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Payment Breakdown</h4>
            <div className="bg-[#FAFAFB] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-[13px]"><span className="text-[#6B7280]">Subtotal</span><span>₹{(booking.subtotal || 0).toLocaleString("en-IN")}</span></div>
              {(booking.discount_amount || 0) > 0 && <div className="flex justify-between text-[13px]"><span className="text-[#6B7280]">Discount</span><span className="text-green-600">-₹{booking.discount_amount.toLocaleString("en-IN")}</span></div>}
              {(booking.platform_fee || 0) > 0 && <div className="flex justify-between text-[13px]"><span className="text-[#6B7280]">Platform Fee</span><span>₹{booking.platform_fee.toLocaleString("en-IN")}</span></div>}
              {(booking.tax_amount || 0) > 0 && <div className="flex justify-between text-[13px]"><span className="text-[#6B7280]">Tax</span><span>₹{booking.tax_amount.toLocaleString("en-IN")}</span></div>}
              <div className="flex justify-between text-[14px] font-bold border-t border-[#E5E7EB]/60 pt-2"><span>Total</span><span>₹{booking.total_amount.toLocaleString("en-IN")}</span></div>
              <div className="flex items-center gap-2 mt-1">
                <CreditCard size={14} className="text-[#9CA3AF]" />
                <span className="text-[13px] text-[#6B7280]">{booking.payment_method || "—"}</span>
                <PaymentBadge status={booking.payment_status || "pending"} />
              </div>
              {payment?.refund_amount ? (
                <div className="flex justify-between text-[13px] text-red-600">
                  <span>Refund</span><span>-₹{payment.refund_amount.toLocaleString("en-IN")}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Timeline</h4>
            <div className="bg-[#FAFAFB] rounded-xl p-4 space-y-2">
              <TimelineRow label="Created" value={booking.created_at} />
              <TimelineRow label="Updated" value={booking.updated_at} />
              {booking.check_in_time && <TimelineRow label="Checked In" value={booking.check_in_time} />}
              {booking.completed_time && <TimelineRow label="Completed" value={booking.completed_time} />}
              {booking.cancelled_at && <TimelineRow label="Cancelled" value={booking.cancelled_at} />}
              {booking.cancellation_reason && (
                <div className="flex items-start gap-2 text-[13px] text-red-600">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>Reason: {booking.cancellation_reason}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {booking.notes && (
          <div className="mb-5">
            <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Notes</h4>
            <div className="bg-[#FAFAFB] rounded-xl p-4 text-[13px] text-[#374151] whitespace-pre-wrap">{booking.notes}</div>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <Icon size={14} className="text-[#9CA3AF] flex-shrink-0" />
      <span className="text-[#111827] truncate">{label}</span>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
      <Clock size={14} className="flex-shrink-0" />
      <span>{label}: {new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
    </div>
  );
}

function BookingActionsDropdown({ booking, onView, onEditStatus, onAssignStaff, onCancel, onRefund, onReschedule }: {
  booking: Booking; onView: () => void; onEditStatus: () => void; onAssignStaff: () => void; onCancel: () => void; onRefund: () => void; onReschedule: () => void;
}) {
  const [open, setOpen] = useState(false);
  const actions = [
    { label: "View Details", icon: Eye, onClick: onView },
    { label: "Edit Status", icon: Edit3, onClick: onEditStatus },
    { label: "Assign Staff", icon: UserPlus, onClick: onAssignStaff },
    { label: "Reschedule", icon: CalendarClock, onClick: onReschedule },
    { label: "Cancel", icon: Ban, onClick: onCancel },
    ...(booking.payment_status === "paid" || booking.payment_status === "completed" ? [{ label: "Refund", icon: Undo, onClick: onRefund }] : []),
  ];
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer">
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white rounded-xl border border-[#E5E7EB]/60 shadow-lg overflow-hidden">
            {actions.map((a) => (
              <button key={a.label} onClick={() => { setOpen(false); a.onClick(); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-[#FAFAFB] transition-colors cursor-pointer ${
                  a.label === "Cancel" ? "text-red-600" : a.label === "Refund" ? "text-purple-600" : "text-[#374151]"
                }`}>
                <a.icon size={14} className={a.label === "Cancel" ? "text-red-400" : a.label === "Refund" ? "text-purple-400" : "text-[#9CA3AF]"} />
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
