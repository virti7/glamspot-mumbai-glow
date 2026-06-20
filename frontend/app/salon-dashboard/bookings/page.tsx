"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking } from "@/services/booking.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Calendar, Clock, User } from "lucide-react";

export default function SalonBookingsPage() {
  const { loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      bookingService.getSalonBookings()
        .then(setBookings)
        .catch(() => setError("Failed to load bookings"))
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  const handleStatus = async (id: string, status: string) => {
    try {
      await bookingService.updateStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch {
      setError("Failed to update status");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-green-50 text-green-700 border-green-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    checked_in: "bg-purple-50 text-purple-700 border-purple-200",
    in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">Salon Bookings</h1>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No bookings yet.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E8E8] bg-[#F8F8F8]">
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Customer</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Date & Time</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Amount</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Status</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-[#9CA3AF]" />
                          <span className="text-[14px] text-[#111]">{(booking as any).user?.full_name || "Customer"}</span>
                        </div>
                        <span className="text-[12px] text-[#6B7280]">{(booking as any).user?.phone || ""}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[13px] text-[#333]">
                          <Calendar size={13} className="text-[#9CA3AF]" />
                          {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <div className="flex items-center gap-1.5 text-[13px] text-[#333] mt-0.5">
                          <Clock size={13} className="text-[#9CA3AF]" />
                          {booking.start_time}
                        </div>
                      </td>
                      <td className="p-4 text-[14px] font-medium text-[#111]">₹{booking.total_amount}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${statusColors[booking.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                          {booking.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        {booking.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleStatus(booking.id, "confirmed")} className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-[12px] font-medium border border-green-200 hover:bg-green-100 transition">
                              Confirm
                            </button>
                            <button onClick={() => handleStatus(booking.id, "cancelled")} className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-[12px] font-medium border border-red-200 hover:bg-red-100 transition">
                              Cancel
                            </button>
                          </div>
                        )}
                        {booking.status === "confirmed" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleStatus(booking.id, "checked_in")} className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[12px] font-medium border border-purple-200 hover:bg-purple-100 transition">
                              Check In
                            </button>
                            <button onClick={() => handleStatus(booking.id, "completed")} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-medium border border-blue-200 hover:bg-blue-100 transition">
                              Complete
                            </button>
                          </div>
                        )}
                        {booking.status === "checked_in" && (
                          <button onClick={() => handleStatus(booking.id, "completed")} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[12px] font-medium border border-blue-200 hover:bg-blue-100 transition">
                            Mark Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
