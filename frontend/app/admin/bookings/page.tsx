"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Calendar, Loader2, Shield, Search, User, Store, IndianRupee, Clock, Filter } from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  salon_id: string;
  user_id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_amount: number;
  created_at: string;
  notes: string;
  salon?: { name: string; slug: string };
  customer?: { full_name: string; email: string };
}

export default function AdminBookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchBookings = () => {
    setLoading(true);
    api.get<Booking[]>("/admin/bookings")
      .then(setBookings)
      .catch(() => setError("Failed to load bookings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (profile?.role === "admin") fetchBookings(); }, [profile]);

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-[#111] text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-[#6B7280] text-[13px]">Admin Only</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };

  const filtered = bookings.filter((b) => {
    const matchesStatus = filter === "all" || b.status === filter;
    const matchesSearch = !search ||
      b.salon?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.id?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filterTabs = [
    { key: "all", label: "All", count: bookings.length },
    { key: "pending", label: "Pending", count: bookings.filter((b) => b.status === "pending").length },
    { key: "confirmed", label: "Confirmed", count: bookings.filter((b) => b.status === "confirmed").length },
    { key: "completed", label: "Completed", count: bookings.filter((b) => b.status === "completed").length },
    { key: "cancelled", label: "Cancelled", count: bookings.filter((b) => b.status === "cancelled").length },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={24} className="text-[#FF4FA2]" />
        <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Bookings</h1>
        <span className="ml-2 text-[13px] text-[#6B7280]">{bookings.length} total</span>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                filter === f.key
                  ? "bg-[#111] text-white border-[#111]"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">({f.count})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search by ID, salon, or customer..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-[14px]">No bookings found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">ID</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Customer</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Salon</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Date & Time</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Amount</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <span className="text-[12px] font-mono text-[#6B7280]">#{booking.id.slice(0, 8)}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-[13px] font-medium text-[#111]">{booking.customer?.full_name || "Unknown"}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{booking.customer?.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-gray-400" />
                        <span className="text-[13px] text-[#111]">{booking.salon?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
                        <Calendar size={12} />
                        {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280] mt-0.5">
                        <Clock size={12} />
                        {booking.booking_time}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[14px] font-semibold text-[#111]">₹{booking.total_amount?.toLocaleString() || 0}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusColors[booking.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
