"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking, type BookingService } from "@/services/booking.service";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Clock,
  XCircle,
  ChevronRight,
  RefreshCcw,
  AlertCircle,
  Receipt,
  User,
  Phone,
  Mail,
  Scissors,
  CreditCard,
  Banknote,
  Hash,
  Loader2,
} from "lucide-react";

type TabFilter = "upcoming" | "completed" | "cancelled" | "all";

const STATUS_GROUPS: Record<TabFilter, string[]> = {
  upcoming: ["pending", "confirmed", "checked_in", "in_progress"],
  completed: ["completed"],
  cancelled: ["cancelled", "no_show"],
  all: [],
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "success" | "info" | "destructive" | "secondary" | "default"> = {
  pending: "warning",
  confirmed: "success",
  checked_in: "info",
  in_progress: "default",
  completed: "success",
  cancelled: "destructive",
  no_show: "secondary",
};

const PAYMENT_BADGE_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "secondary",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingsPage() {
  const { loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("upcoming");

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setError("");
    try {
      const data = await bookingService.getMyBookings();
      setBookings(data);
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchBookings();
  }, [authLoading, fetchBookings]);

  useEffect(() => {
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    if (activeTab === "all") return bookings;
    const statuses = STATUS_GROUPS[activeTab];
    return bookings.filter((b) => statuses.includes(b.status));
  }, [bookings, activeTab]);

  const stats = useMemo(() => {
    const upcoming = bookings.filter((b) => STATUS_GROUPS.upcoming.includes(b.status));
    const completed = bookings.filter((b) => b.status === "completed");
    const totalSpent = completed.reduce((sum, b) => sum + b.total_amount, 0);
    return {
      total: bookings.length,
      upcoming: upcoming.length,
      completed: completed.length,
      totalSpent,
    };
  }, [bookings]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ];

  const handleCancelClick = (id: string) => {
    setCancellingId(id);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId) return;
    setCancelling(true);
    try {
      await bookingService.updateStatus(cancellingId, "cancelled", { cancellation_reason: cancelReason || undefined });
      toast.success("Booking cancelled successfully");
      setCancelModalOpen(false);
      setCancellingId(null);
      setCancelReason("");
      await fetchBookings();
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailModalOpen(true);
  };

  const getStatusTimeline = (booking: Booking) => {
    const timeline: { status: string; time: string }[] = [];
    if (booking.created_at) timeline.push({ status: "created", time: booking.created_at });
    if (booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "in_progress" || booking.status === "completed") {
      timeline.push({ status: "confirmed", time: booking.updated_at });
    }
    if (booking.status === "checked_in" || booking.status === "in_progress" || booking.status === "completed") {
      timeline.push({ status: "checked_in", time: booking.updated_at });
    }
    if (booking.status === "in_progress" || booking.status === "completed") {
      timeline.push({ status: "in_progress", time: booking.updated_at });
    }
    if (booking.status === "completed") {
      timeline.push({ status: "completed", time: booking.updated_at });
    }
    if (booking.status === "cancelled") {
      timeline.push({ status: "cancelled", time: booking.updated_at });
    }
    if (booking.status === "no_show") {
      timeline.push({ status: "no_show", time: booking.updated_at });
    }
    return timeline;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFB]">
        <CustomerNavbar />
        <main className="max-w-4xl mx-auto px-6 pt-[112px] pb-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl mb-4" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <CustomerNavbar />
      <main className="max-w-4xl mx-auto px-6 pt-[112px] pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-6">My Bookings</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#EC4899] text-white shadow-sm"
                  : "bg-white text-[#6B7280] border border-[#E5E7EB]/60 hover:border-[#EC4899]/30 hover:text-[#EC4899]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 shadow-sm">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Total Bookings</p>
            <p className="text-2xl font-bold text-[#111827] mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 shadow-sm">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Upcoming</p>
            <p className="text-2xl font-bold text-[#EC4899] mt-1">{stats.upcoming}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 shadow-sm">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-[#16A34A] mt-1">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 shadow-sm">
            <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Total Spent</p>
            <p className="text-2xl font-bold text-[#111827] mt-1">₹{stats.totalSpent.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchBookings}>
              <RefreshCcw size={14} /> Retry
            </Button>
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={64} className="mx-auto text-[#D1D5DB] mb-4" />
            <h3 className="text-lg font-semibold text-[#111827] mb-2">No bookings yet</h3>
            <p className="text-sm text-[#6B7280] mb-6">
              {activeTab === "upcoming"
                ? "You don't have any upcoming bookings."
                : activeTab === "completed"
                  ? "No completed bookings found."
                  : activeTab === "cancelled"
                    ? "No cancelled bookings."
                    : "Discover salons and book your first appointment."}
            </p>
            <Link href="/salons">
              <Button className="bg-[#EC4899] hover:bg-[#DB2777]">
                Browse Salons <ChevronRight size={16} />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#111827] text-[15px] truncate">
                          {booking.salon?.name || "Salon"}
                        </h3>
                        {booking.salon?.locality && (
                          <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-0.5">
                            <MapPin size={12} /> {booking.salon.locality}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {booking.booking_reference && (
                          <p className="text-xs text-[#9CA3AF] font-mono">#{booking.booking_reference}</p>
                        )}
                        <Badge variant={STATUS_BADGE_VARIANT[booking.status] || "secondary"}>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-[#6B7280]">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#9CA3AF]" />
                        {formatDate(booking.booking_date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-[#9CA3AF]" />
                        {booking.start_time} - {booking.end_time}
                      </span>
                    </div>

                    {booking.booking_services && booking.booking_services.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <Scissors size={12} className="text-[#9CA3AF]" />
                        {booking.booking_services.map((s: BookingService) => (
                          <span
                            key={s.id}
                            className="text-xs bg-[#F3F4F6] text-[#6B7280] rounded-full px-2.5 py-0.5"
                          >
                            {s.service_name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm">
                      {booking.staff?.name && (
                        <span className="flex items-center gap-1.5 text-[#6B7280]">
                          <User size={13} className="text-[#9CA3AF]" /> {booking.staff.name}
                        </span>
                      )}
                      <span className="font-semibold text-[#111827]">
                        ₹{booking.total_amount.toLocaleString("en-IN")}
                      </span>
                      <Badge
                        variant={PAYMENT_BADGE_VARIANT[booking.payment_status] || "secondary"}
                        className="text-[10px] px-2 py-0"
                      >
                        <CreditCard size={10} className="mr-0.5" />
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:flex-col lg:shrink-0">
                    {(booking.status === "pending" || booking.status === "confirmed") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelClick(booking.id)}
                        className="text-[#EF4444] border-[#FCA5A5] hover:bg-[#FEF2F2] hover:border-[#EF4444] w-full lg:w-auto"
                      >
                        <XCircle size={14} /> Cancel
                      </Button>
                    )}
                    {booking.status === "in_progress" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(booking)}
                      >
                        View Details
                      </Button>
                    )}
                    {booking.status === "completed" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(booking)}
                        >
                          View Details
                        </Button>
                        <Link href={`/salons/${booking.salon?.slug || ""}`}>
                          <Button size="sm" className="bg-[#EC4899] hover:bg-[#DB2777]">
                            Book Again
                          </Button>
                        </Link>
                      </>
                    )}
                    {booking.status === "cancelled" && (
                      <Link href={`/salons/${booking.salon?.slug || ""}`}>
                        <Button size="sm" className="bg-[#EC4899] hover:bg-[#DB2777]">
                          Book Again
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#111827]">
              Reason for cancellation (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us why you're cancelling..."
              rows={3}
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Cancelling...
                </>
              ) : (
                "Confirm Cancel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt size={18} className="text-[#EC4899]" />
                  Booking Details
                  {selectedBooking.booking_reference && (
                    <span className="text-sm font-normal text-[#9CA3AF] font-mono">
                      #{selectedBooking.booking_reference}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[#111827] text-lg">
                      {selectedBooking.salon?.name || "Salon"}
                    </h3>
                    {selectedBooking.salon?.locality && (
                      <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {selectedBooking.salon.locality}
                        {selectedBooking.salon?.city && `, ${selectedBooking.salon.city}`}
                      </p>
                    )}
                  </div>
                  <Badge variant={STATUS_BADGE_VARIANT[selectedBooking.status] || "secondary"} className="text-xs">
                    {selectedBooking.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[#9CA3AF] text-xs font-medium">Date</p>
                    <p className="text-[#111827] flex items-center gap-1.5">
                      <Calendar size={14} className="text-[#9CA3AF]" />
                      {formatDate(selectedBooking.booking_date)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#9CA3AF] text-xs font-medium">Time</p>
                    <p className="text-[#111827] flex items-center gap-1.5">
                      <Clock size={14} className="text-[#9CA3AF]" />
                      {selectedBooking.start_time} - {selectedBooking.end_time}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[#9CA3AF] text-xs font-medium mb-2">Status Timeline</p>
                  <div className="space-y-2">
                    {getStatusTimeline(selectedBooking).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#EC4899] shrink-0" />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm text-[#111827] capitalize">
                            {item.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-[#9CA3AF]">{formatDateTime(item.time)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedBooking.booking_services && selectedBooking.booking_services.length > 0 && (
                  <div>
                    <p className="text-[#9CA3AF] text-xs font-medium mb-2">Services</p>
                    <div className="divide-y divide-[#E5E7EB]/60 border border-[#E5E7EB]/60 rounded-xl">
                      {selectedBooking.booking_services.map((s: BookingService) => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-[#111827]">{s.service_name}</span>
                          <span className="text-[#6B7280] font-medium">₹{s.price.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBooking.staff?.name && (
                  <div>
                    <p className="text-[#9CA3AF] text-xs font-medium mb-2">Staff</p>
                    <div className="flex items-center gap-2 text-sm text-[#111827]">
                      <User size={14} className="text-[#9CA3AF]" />
                      {selectedBooking.staff.name}
                      {selectedBooking.staff.role && (
                        <span className="text-[#6B7280]">({selectedBooking.staff.role})</span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[#9CA3AF] text-xs font-medium mb-2">Customer</p>
                  <div className="space-y-1.5 text-sm">
                    {selectedBooking.customer_name && (
                      <p className="flex items-center gap-2 text-[#111827]">
                        <User size={14} className="text-[#9CA3AF]" /> {selectedBooking.customer_name}
                      </p>
                    )}
                    {selectedBooking.customer_phone && (
                      <p className="flex items-center gap-2 text-[#111827]">
                        <Phone size={14} className="text-[#9CA3AF]" /> {selectedBooking.customer_phone}
                      </p>
                    )}
                    {selectedBooking.customer_email && (
                      <p className="flex items-center gap-2 text-[#111827]">
                        <Mail size={14} className="text-[#9CA3AF]" /> {selectedBooking.customer_email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB]/60 pt-4">
                  <p className="text-[#9CA3AF] text-xs font-medium mb-3">Payment Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">Subtotal</span>
                      <span className="text-[#111827]">₹{selectedBooking.subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    {selectedBooking.discount_amount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Discount</span>
                        <span className="text-[#16A34A]">-₹{selectedBooking.discount_amount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">Platform Fee</span>
                      <span className="text-[#111827]">₹{selectedBooking.platform_fee.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">Tax</span>
                      <span className="text-[#111827]">₹{selectedBooking.tax_amount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#E5E7EB]/60 pt-2 font-semibold text-[#111827]">
                      <span>Grand Total</span>
                      <span className="text-lg">₹{selectedBooking.total_amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className="text-[#6B7280]">Payment:</span>
                    <Badge variant={PAYMENT_BADGE_VARIANT[selectedBooking.payment_status] || "secondary"} className="text-[10px] px-2 py-0">
                      <Banknote size={10} className="mr-0.5" />
                      {selectedBooking.payment_status}
                    </Badge>
                    {selectedBooking.payment_method && (
                      <span className="text-[#6B7280] text-xs">
                        via {selectedBooking.payment_method.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>

                {selectedBooking.cancellation_reason && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-red-200">
                    <p className="text-xs font-medium text-[#EF4444] mb-1">Cancellation Reason</p>
                    <p className="text-sm text-[#991B1B]">{selectedBooking.cancellation_reason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
