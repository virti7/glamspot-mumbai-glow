"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking } from "@/services/booking.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Calendar, MapPin, Clock, XCircle, ChevronRight } from "lucide-react";

export default function BookingsPage() {
  const { loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      bookingService.getMyBookings()
        .then(setBookings)
        .catch(() => setError("Failed to load bookings"))
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  const handleCancel = async (id: string) => {
    try {
      await bookingService.updateStatus(id, "cancelled");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } catch {
      setError("Failed to cancel booking");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    checked_in: "bg-purple-50 text-purple-700 border-purple-200",
    in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
    no_show: "bg-gray-50 text-gray-700 border-gray-200",
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-[#999]">Loading bookings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">My Bookings</h1>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            <Calendar size={48} className="mx-auto text-[#ccc] mb-4" />
            <h3 className="font-display text-[#111] text-xl font-bold mb-2">No Bookings Yet</h3>
            <p className="text-[#6B7280] text-[14px] mb-6">Discover salons and book your first appointment.</p>
            <Link
              href="/salons"
              className="inline-flex items-center gap-2 bg-[#111] text-white rounded-full px-6 py-3 text-[14px] font-semibold hover:bg-[#333] transition"
            >
              Browse Salons <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl border border-[#E8E8E8] p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[#111] text-[15px]">
                        {booking.salon?.name || "Salon"}
                      </h3>
                      <p className="text-[13px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {booking.salon?.locality || ""}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${statusColors[booking.status] || statusColors.pending}`}>
                      {booking.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-[13px] text-[#6B7280]">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> {new Date(booking.booking_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {booking.start_time}
                    </span>
                    <span className="font-medium text-[#111]">
                      ₹{booking.total_amount}
                    </span>
                  </div>
                </div>
                {(booking.status === "pending" || booking.status === "confirmed") && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="flex items-center gap-1.5 text-[13px] text-red-500 hover:text-red-700 transition px-3 py-1.5 rounded-full hover:bg-red-50"
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
