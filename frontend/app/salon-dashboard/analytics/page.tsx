"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking } from "@/services/booking.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DollarSign, Calendar, Users, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

export default function SalonAnalyticsPage() {
  const { loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      bookingService.getSalonBookings()
        .then(setBookings)
        .catch(() => setError("Failed to load analytics"))
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const todayBookings = bookings.filter(b => b.booking_date === todayStr);
  const weeklyBookings = bookings.filter(b => b.booking_date >= weekAgo.toISOString().slice(0, 10));
  const monthlyBookings = bookings.filter(b => b.booking_date >= monthAgo.toISOString().slice(0, 10));
  const completedBookings = bookings.filter(b => b.status === "completed");

  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const avgBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

  const uniqueCustomers = new Set(bookings.map(b => b.user_id)).size;

  // Popular services
  const serviceCounts: Record<string, number> = {};
  bookings.forEach(b => {
    if ((b as any).booking_services) {
      (b as any).booking_services.forEach((bs: any) => {
        serviceCounts[bs.service_name] = (serviceCounts[bs.service_name] || 0) + 1;
      });
    }
  });
  const popularServices = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const summaryCards = [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500" },
    { label: "Monthly Bookings", value: String(monthlyBookings.length), icon: Calendar, color: "text-blue-500" },
    { label: "Avg Booking Value", value: `₹${avgBookingValue.toFixed(0)}`, icon: TrendingUp, color: "text-purple-500" },
    { label: "Total Customers", value: String(uniqueCustomers), icon: Users, color: "text-amber-500" },
  ];

  const periodCards = [
    { label: "Today", count: todayBookings.length, revenue: todayBookings.reduce((s, b) => s + (b.total_amount || 0), 0) },
    { label: "This Week", count: weeklyBookings.length, revenue: weeklyBookings.reduce((s, b) => s + (b.total_amount || 0), 0) },
    { label: "This Month", count: monthlyBookings.length, revenue: monthlyBookings.reduce((s, b) => s + (b.total_amount || 0), 0) },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">Analytics</h1>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading analytics...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No analytics data yet. Data will appear once bookings are made.</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {summaryCards.map((card) => (
                <div key={card.label} className="bg-white rounded-xl p-5 border border-[#E8E8E8]">
                  <card.icon size={20} className={card.color} />
                  <p className="text-2xl font-bold text-[#111] mt-2">{card.value}</p>
                  <p className="text-[13px] text-[#6B7280]">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Period Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {periodCards.map((p) => (
                <div key={p.label} className="bg-white rounded-xl p-5 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#111] text-[15px]">{p.label}</h3>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-[12px] text-[#6B7280]">Bookings</p>
                      <p className="text-xl font-bold text-[#111]">{p.count}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] text-[#6B7280]">Revenue</p>
                      <p className="text-xl font-bold text-[#111]">₹{p.revenue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Popular Services */}
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
              <h3 className="font-semibold text-[#111] text-[15px] mb-4">Popular Services</h3>
              {popularServices.length === 0 ? (
                <p className="text-[#6B7280] text-[13px]">No service data yet.</p>
              ) : (
                <div className="space-y-3">
                  {popularServices.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-[14px] text-[#111]">{name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-[#F8F8F8] rounded-full h-2">
                          <div
                            className="bg-[#F5C842] h-full rounded-full"
                            style={{ width: `${Math.min(100, (count / popularServices[0][1]) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[13px] text-[#6B7280] w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
