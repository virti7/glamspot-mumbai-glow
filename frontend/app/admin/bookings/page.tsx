"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking } from "@/services/booking.service";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import {
  Calendar, CalendarCheck, Clock, DollarSign, Search, Loader2, Shield,
  User, Store, Phone, X as XIcon, CheckCircle,
  AlertCircle, CreditCard, UserPlus, RefreshCw, Download,
  MoreHorizontal, Eye, Edit3, Ban, Undo, TrendingUp, FileText,
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
};

const paymentColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-600 border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusColors[status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 animate-pulse">
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface ActionsDropdownProps {
  booking: Booking;
  onView: () => void;
  onEditStatus: () => void;
  onAssignStaff: () => void;
  onCancel: () => void;
  onRefund: () => void;
}

function ActionsDropdown({ onView, onEditStatus, onAssignStaff, onCancel, onRefund }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: "View Details", icon: Eye, onClick: onView },
    { label: "Edit Status", icon: Edit3, onClick: onEditStatus },
    { label: "Assign Staff", icon: UserPlus, onClick: onAssignStaff },
    { label: "Cancel", icon: Ban, onClick: onCancel },
    { label: "Refund", icon: Undo, onClick: onRefund },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#FAFAFB] cursor-pointer"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white rounded-xl border border-[#E5E7EB]/60 shadow-lg overflow-hidden">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => { setOpen(false); a.onClick(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#FAFAFB] transition-colors cursor-pointer"
              >
                <a.icon size={14} className="text-[#9CA3AF]" />
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Booking | null>(null);
  const [statusTarget, setStatusTarget] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [assignTarget, setAssignTarget] = useState<Booking | null>(null);
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [staffList, setStaffList] = useState<{ id: string; name: string; role: string | null }[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    setError("");
    bookingService.adminGetAll(statusFilter || undefined)
      .then(setBookings)
      .catch(() => setError("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    if (profile?.role === "admin") fetchBookings();
  }, [profile, fetchBookings]);

  useEffect(() => {
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const todayStr = new Date().toISOString().split("T")[0];
  const totalBookings = bookings.length;
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr).length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const totalRevenue = bookings
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum, b) => sum + b.total_amount, 0);
  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter((b) => {
      const ref = b.booking_reference?.toLowerCase() || b.id.toLowerCase();
      const name = b.user?.full_name?.toLowerCase() || b.customer_name?.toLowerCase() || "";
      const salon = b.salon?.name?.toLowerCase() || "";
      return ref.includes(q) || name.includes(q) || salon.includes(q);
    });
  }, [bookings, searchQuery]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const csv = await bookingService.adminExportCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export CSV");
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
    } catch {
      toast.error("Failed to update status");
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
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      await bookingService.adminRefund(refundTarget.id, amount);
      toast.success("Refund processed successfully");
      setRefundTarget(null);
      setRefundAmount("");
      fetchBookings();
    } catch {
      toast.error("Failed to process refund");
    } finally {
      setRefunding(false);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Bookings</h1>
          <p className="text-sm text-[#6B7280]">{totalBookings} total bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exporting || totalBookings === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#FAFAFB] transition-all disabled:opacity-50 cursor-pointer"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] hover:bg-[#FAFAFB] transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonCards />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[
            { label: "Total Bookings", value: totalBookings, icon: CalendarCheck, color: "#EC4899", bg: "bg-pink-50" },
            { label: "Today's Bookings", value: todayBookings, icon: Calendar, color: "#3B82F6", bg: "bg-blue-50" },
            { label: "Pending", value: pendingCount, icon: Clock, color: "#F59E0B", bg: "bg-amber-50" },
            { label: "Completed", value: completedCount, icon: CheckCircle, color: "#22C55E", bg: "bg-green-50" },
            { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "#8B5CF6", bg: "bg-purple-50" },
            { label: "Avg Booking Value", value: `₹${avgBookingValue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "#10B981", bg: "bg-emerald-50" },
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
      )}

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
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer ${
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
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by ref, customer, or salon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E7EB]/60 text-sm text-[#111827] bg-white focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] placeholder:text-[#9CA3AF] outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden p-12 flex items-center justify-center">
          <Loader2 size={24} className="text-gray-300 animate-spin" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-12 text-center">
          <CalendarCheck size={40} className="mx-auto text-[#D1D5DB] mb-3" />
          <p className="text-[#111827] font-semibold text-[15px]">No bookings found</p>
          <p className="text-[#6B7280] text-[13px] mt-1">
            {searchQuery ? "Try a different search term" : "No bookings match the selected filter"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]/60 bg-[#F3F4F6]">
                  {["Ref #", "Salon", "Customer", "Phone", "Services", "Date & Time", "Amount", "Payment", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-[#E5E7EB]/60 hover:bg-[#FAFAFB] transition-colors">
                    <td className="p-4">
                      <span className="text-[13px] font-mono font-medium text-[#EC4899]">
                        {booking.booking_reference || `#${booking.id.slice(0, 8).toUpperCase()}`}
                      </span>
                    </td>
                    <td className="p-4">
                      {booking.salon ? (
                        <div className="flex items-center gap-1.5">
                          <Store size={13} className="text-[#9CA3AF] flex-shrink-0" />
                          <span className="text-[13px] font-medium text-[#111827]">{booking.salon.name}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-[#6B7280]">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-[#9CA3AF] flex-shrink-0" />
                        <div>
                          <p className="text-[13px] text-[#111827]">{booking.user?.full_name || booking.customer_name || "Guest"}</p>
                          {(booking.user?.email || booking.customer_email) && (
                            <p className="text-[11px] text-[#9CA3AF]">{booking.user?.email || booking.customer_email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[13px] text-[#6B7280]">{booking.user?.phone || booking.customer_phone || "—"}</span>
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
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280] mt-0.5">
                        <Clock size={11} className="text-[#9CA3AF]" />
                        {booking.start_time} - {booking.end_time}
                      </div>
                    </td>
                    <td className="p-4 text-[14px] font-semibold text-[#111827] whitespace-nowrap">
                      ₹{booking.total_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <PaymentBadge status={booking.payment_status} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-[12px] text-[#6B7280]">
                        {new Date(booking.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="p-4">
                      <ActionsDropdown
                        booking={booking}
                        onView={() => setDetailTarget(booking)}
                        onEditStatus={() => { setStatusTarget(booking); setNewStatus(booking.status); }}
                        onAssignStaff={() => openAssignStaff(booking)}
                        onCancel={() => { setCancelTarget(booking); setCancelReason(""); }}
                        onRefund={() => { setRefundTarget(booking); setRefundAmount(""); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#111827]">
                  Booking {detailTarget.booking_reference || `#${detailTarget.id.slice(0, 8).toUpperCase()}`}
                </h3>
                <span className="mt-1 inline-block"><StatusBadge status={detailTarget.status} /></span>
              </div>
              <button onClick={() => setDetailTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer">
                <XIcon size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="bg-[#FAFAFB] rounded-xl p-4">
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Customer Details</h4>
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
                    <FileText size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.user?.email || detailTarget.customer_email || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFAFB] rounded-xl p-4">
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Booking Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[13px]">
                    <Store size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.salon?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Calendar size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">
                      {new Date(detailTarget.booking_date).toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric", year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Clock size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.start_time} - {detailTarget.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <UserPlus size={14} className="text-[#9CA3AF]" />
                    <span className="text-[#111827]">{detailTarget.staff?.name || detailTarget.assigned_staff_id || "Unassigned"}</span>
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

            <div className="mb-6">
              <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Selected Services</h4>
              <div className="bg-[#FAFAFB] rounded-xl divide-y divide-[#E5E7EB]/60">
                {detailTarget.booking_services?.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-[14px] text-[#111827]">{svc.service_name}</span>
                    <span className="text-[14px] font-medium text-[#111827]">₹{svc.price.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-white/50">
                  <span className="text-[14px] font-semibold text-[#111827]">Total</span>
                  <span className="text-[15px] font-bold text-[#111827]">₹{detailTarget.total_amount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <h4 className="text-[12px] font-semibold text-[#6B7280] uppercase mb-3">Payment</h4>
                <div className="bg-[#FAFAFB] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-[#9CA3AF]" />
                      <span className="text-[13px] text-[#111827]">{detailTarget.payment_method || "—"}</span>
                    </div>
                    <PaymentBadge status={detailTarget.payment_status} />
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

            <button onClick={() => setDetailTarget(null)} className="w-full py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setStatusTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Edit Status</h3>
              <button onClick={() => setStatusTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer">
                <XIcon size={18} />
              </button>
            </div>
            <p className="text-[14px] text-[#6B7280] mb-4">
              Change status for <strong>{statusTarget.booking_reference || `#${statusTarget.id.slice(0, 8).toUpperCase()}`}</strong>
            </p>
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStatusTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus || newStatus === statusTarget.status}
                className="flex-1 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold border-none hover:bg-[#DB2777] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {updatingStatus && <Loader2 size={14} className="animate-spin" />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAssignTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Assign Staff</h3>
              <button onClick={() => setAssignTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer">
                <XIcon size={18} />
              </button>
            </div>
            <p className="text-[14px] text-[#6B7280] mb-4">
              Select a staff member for <strong>{assignTarget.booking_reference || `#${assignTarget.id.slice(0, 8).toUpperCase()}`}</strong>
            </p>
            {staffLoading ? (
              <div className="flex items-center justify-center py-8 text-[#6B7280]">
                <Loader2 size={18} className="animate-spin mr-2" />
                Loading staff...
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-center py-8 text-[#9CA3AF] text-[14px]">No staff members available</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-5">
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => handleAssignStaff(staff.id)}
                    disabled={assigning}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E7EB]/60 hover:border-[#EC4899]/30 hover:bg-[#FAFAFB] transition-all disabled:opacity-50 text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-[#111827]">{staff.name}</p>
                      <p className="text-[12px] text-[#6B7280]">{staff.role || "Staff"}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                      Active
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAssignTarget(null)} className="w-full py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setCancelTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Cancel Booking</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer">
                <XIcon size={18} />
              </button>
            </div>
            <p className="text-[14px] text-[#6B7280] mb-4">
              Cancel booking <strong>{cancelTarget.booking_reference || `#${cancelTarget.id.slice(0, 8).toUpperCase()}`}</strong>?
            </p>
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Cancellation Reason *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Provide a reason..."
                className="w-full rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] py-2.5 resize-none outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {cancelling && <Loader2 size={14} className="animate-spin" />}
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRefundTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Process Refund</h3>
              <button onClick={() => setRefundTarget(null)} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF] cursor-pointer">
                <XIcon size={18} />
              </button>
            </div>
            <p className="text-[14px] text-[#6B7280] mb-2">
              Refund for <strong>{refundTarget.booking_reference || `#${refundTarget.id.slice(0, 8).toUpperCase()}`}</strong>
            </p>
            <p className="text-[13px] text-[#6B7280] mb-5">
              Full amount: <strong>₹{refundTarget.total_amount.toLocaleString("en-IN")}</strong>
            </p>
            <div className="mb-5">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Default: Full amount (₹${refundTarget.total_amount.toLocaleString("en-IN")})`}
                className="w-full h-11 rounded-xl border border-[#E5E7EB] px-4 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899]"
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1.5">Leave empty to refund the full amount</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRefundTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {refunding && <Loader2 size={14} className="animate-spin" />}
                Process Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
