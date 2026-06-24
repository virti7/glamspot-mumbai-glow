"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { BarChart3, Loader2, Shield, TrendingUp, Users, Store, Calendar, Star, IndianRupee } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";

interface AnalyticsData {
  period: string;
  users: { total: number; trend: Record<string, number> };
  salons: { total: number; claimed: number; trend: Record<string, number> };
  bookings: { total: number; revenue: number; trend: Record<string, number>; revenueTrend: Record<string, number>; byStatus: Record<string, number> };
  reviews: { total: number; trend: Record<string, number> };
}

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = (p: string) => {
    setLoading(true);
    api.get<AnalyticsData>(`/admin/analytics?period=${p}`)
      .then(setData)
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (profile?.role === "admin") fetchAnalytics(period); }, [profile, period]);

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

  const periods = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
    { key: "1y", label: "1 Year" },
  ];

  const trendToChartData = (trend: Record<string, number>) =>
    Object.entries(trend).map(([date, value]) => ({ date, value }));

  const metricCards = data ? [
    { label: "New Users", value: data.users.total, icon: Users, color: "#3B82F6", bg: "bg-blue-50" },
    { label: "New Salons", value: data.salons.total, icon: Store, color: "#22C55E", bg: "bg-green-50" },
    { label: "Claimed Salons", value: data.salons.claimed, icon: Store, color: "#8B5CF6", bg: "bg-purple-50" },
    { label: "Bookings", value: data.bookings.total, icon: Calendar, color: "#EC4899", bg: "bg-pink-50" },
    { label: "Revenue", value: `₹${data.bookings.revenue.toLocaleString()}`, icon: IndianRupee, color: "#F59E0B", bg: "bg-amber-50" },
    { label: "Reviews", value: data.reviews.total, icon: Star, color: "#F43F5E", bg: "bg-rose-50" },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={24} className="text-[#FF4FA2]" />
          <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Analytics</h1>
        </div>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                period === p.key
                  ? "bg-[#111] text-white border-[#111]"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-gray-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      {loading || !data ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {metricCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.bg}`}>
                  <card.icon size={16} style={{ color: card.color }} />
                </div>
                <p className="text-lg font-bold text-[#111]">{card.value}</p>
                <p className="text-[11px] text-[#6B7280] font-medium">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Growth */}
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">User Growth</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendToChartData(data.users.trend)}>
                    <defs>
                      <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#userGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Salon Growth */}
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">Salon Growth</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendToChartData(data.salons.trend)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Booking Trends */}
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">Booking Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendToChartData(data.bookings.trend)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#EC4899" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Trends */}
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">Revenue Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendToChartData(data.bookings.revenueTrend)}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Booking Status Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 mb-8">
            <h3 className="font-semibold text-[#111] text-[14px] mb-4">Booking Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.bookings.byStatus).map(([status, count]) => {
                const colors: Record<string, string> = {
                  pending: "bg-amber-50 text-amber-700 border-amber-200",
                  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
                  completed: "bg-green-50 text-green-700 border-green-200",
                  cancelled: "bg-red-50 text-red-700 border-red-200",
                };
                return (
                  <div key={status} className={`rounded-xl p-4 border ${colors[status] || "bg-gray-50 border-gray-200"}`}>
                    <p className="text-2xl font-bold">{count as number}</p>
                    <p className="text-[13px] font-medium capitalize">{status}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
