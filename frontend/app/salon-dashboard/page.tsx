"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { salonService } from "@/services/salon.service";
import {
  DollarSign, Calendar, Users, Star, TrendingUp, Store,
  ArrowUpRight, Clock, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  todayBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
  averageRating: number;
  totalReviews: number;
  totalCustomers: number;
}

interface ChartPoint {
  date: string;
  bookings: number;
  revenue: number;
  completed: number;
}

export default function SalonDashboardPage() {
  const { profile } = useAuth();
  const [salon, setSalon] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    const load = async () => {
      try {
        const [salonData, statsData, chartRes] = await Promise.all([
          salonService.getOwnerSalon(),
          fetch("/api/salon-management/stats").then((r) => r.json()),
          fetch("/api/salon-management/charts?days=30").then((r) => r.json()),
        ]);
        setSalon(salonData);
        setStats(statsData);
        setChartData(chartRes.trend || []);
      } catch {
        setError("No salon found for this account");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <Store size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="font-display text-[20px] font-bold text-[#111] mb-2">No Salon Found</h2>
        <p className="text-gray-400 text-[14px] mb-6 max-w-md mx-auto">
          You don&apos;t own any salons yet. Search for your salon and submit an ownership claim.
        </p>
        <Link
          href="/salon-dashboard/profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#EC4899] text-white text-[13px] font-semibold"
        >
          Claim Your Salon
          <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: "Today's Bookings", value: stats?.todayBookings ?? 0, icon: Calendar, color: "#8B5CF6" },
    { label: "Total Revenue", value: `₹${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "#22C55E" },
    { label: "Monthly Revenue", value: `₹${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "#EC4899" },
    { label: "Total Bookings", value: stats?.totalBookings ?? 0, icon: Clock, color: "#F59E0B" },
    { label: "Avg Rating", value: stats?.averageRating ?? 0, icon: Star, color: "#F5C842" },
    { label: "Customers", value: stats?.totalCustomers ?? 0, icon: Users, color: "#3B82F6" },
  ];

  const last7Days = chartData.slice(-7);
  const totalRevenue = last7Days.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = last7Days.reduce((s, d) => s + d.bookings, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-[#6B7280] text-[14px] mt-1">{salon?.name || "Your Salon"}</p>
        </div>
        <Link
          href="/salons"
          className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111] text-white text-[12px] font-semibold hover:bg-[#333] transition-all"
        >
          <Store size={14} />
          View Public Page
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + "15" }}>
                <stat.icon size={16} style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-lg font-bold text-[#111]">{stat.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111] text-[15px]">Revenue (7 days)</h3>
            <span className="text-[13px] font-bold text-green-600">₹{totalRevenue.toLocaleString()}</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#EC4899" strokeWidth={2} dot={{ r: 3, fill: "#EC4899" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-300 text-[13px]">No data yet</div>
          )}
        </div>

        {/* Bookings Trend */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111] text-[15px]">Bookings (7 days)</h3>
            <span className="text-[13px] font-bold text-[#8B5CF6]">{totalBookings} total</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="bookings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-300 text-[13px]">No data yet</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Bookings", desc: "Manage appointments", href: "/salon-dashboard/bookings", color: "#8B5CF6" },
          { label: "Services", desc: "Add or edit services", href: "/salon-dashboard/services", color: "#EC4899" },
          { label: "Gallery", desc: "Upload salon photos", href: "/salon-dashboard/gallery", color: "#22C55E" },
          { label: "Analytics", desc: "View detailed reports", href: "/salon-dashboard/analytics", color: "#F59E0B" },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: link.color + "15" }}>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: link.color }} />
            </div>
            <h3 className="font-semibold text-[#111] text-[14px] group-hover:text-[#EC4899] transition-colors">{link.label}</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
