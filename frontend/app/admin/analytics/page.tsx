"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { BarChart3, Loader2, Shield, TrendingUp, Users, Store, Calendar, Star, IndianRupee } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

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

  const fetchAnalytics = (p: string) => { setLoading(true); api.get<AnalyticsData>(`/admin/analytics?period=${p}`).then(setData).catch(() => setError("Failed to load analytics")).finally(() => setLoading(false)); };
  useEffect(() => { if (profile?.role === "admin") fetchAnalytics(period); }, [profile, period]);

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const periods = [{ key: "today", label: "Today" }, { key: "7d", label: "7 Days" }, { key: "30d", label: "30 Days" }, { key: "90d", label: "90 Days" }, { key: "1y", label: "1 Year" }];
  const trendToChartData = (trend: Record<string, number>) => Object.entries(trend).map(([date, value]) => ({ date, value }));

  const metricCards = data ? [
    { label: "New Users", value: data.users.total, icon: Users, color: "#3B82F6", bg: "bg-blue-50" },
    { label: "New Salons", value: data.salons.total, icon: Store, color: "#22C55E", bg: "bg-green-50" },
    { label: "Claimed Salons", value: data.salons.claimed, icon: Store, color: "#8B5CF6", bg: "bg-purple-50" },
    { label: "Bookings", value: data.bookings.total, icon: Calendar, color: "#EC4899", bg: "bg-pink-50" },
    { label: "Revenue", value: `₹${data.bookings.revenue.toLocaleString()}`, icon: IndianRupee, color: "#F59E0B", bg: "bg-amber-50" },
    { label: "Reviews", value: data.reviews.total, icon: Star, color: "#F43F5E", bg: "bg-rose-50" },
  ] : [];

  const statusStyles: Record<string, { bg: string; color: string }> = {
    pending: { bg: "bg-amber-100", color: "text-amber-800" }, confirmed: { bg: "bg-blue-100", color: "text-blue-800" },
    completed: { bg: "bg-green-100", color: "text-green-800" }, cancelled: { bg: "bg-red-100", color: "text-red-800" },
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-[#111827] mb-1">Analytics</h1></div>
        <div className="flex gap-1.5">
          {periods.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${
                period === p.key ? "bg-[#111827] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]"
              }`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading || !data ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
            {metricCards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-2.5`}><card.icon size={17} style={{ color: card.color }} /></div>
                <p className="text-[22px] font-bold text-[#111827]">{card.value}</p>
                <p className="text-[11px] text-[#6B7280] font-medium">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {[
              { title: "User Growth", data: trendToChartData(data.users.trend), color: "#3B82F6", id: "userGrad" },
              { title: "Salon Growth", data: trendToChartData(data.salons.trend), color: "#22C55E", id: "salonGrad" },
              { title: "Booking Trends", data: trendToChartData(data.bookings.trend), color: "#EC4899", id: "bookingGrad" },
              { title: "Revenue Trends", data: trendToChartData(data.bookings.revenueTrend), color: "#F59E0B", id: "revGrad" },
            ].map((chart) => (
              <div key={chart.title} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
                <h3 className="text-sm font-semibold text-[#111827] mb-4">{chart.title}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart.data}>
                      <defs>
                        <linearGradient id={chart.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chart.color} stopOpacity={0.1} />
                          <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2} fill={`url(#${chart.id})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
            <h3 className="text-sm font-semibold text-[#111827] mb-4">Booking Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.bookings.byStatus).map(([status, count]) => {
                const ss = statusStyles[status] || statusStyles.pending;
                return (
                  <div key={status} className={`p-4 rounded-xl ${ss.bg}`}>
                    <p className="text-2xl font-bold" style={{ color: ss.color === "text-amber-800" ? "#92400E" : ss.color === "text-blue-800" ? "#1E40AF" : ss.color === "text-green-800" ? "#166534" : "#991B1B" }}>{count as number}</p>
                    <p className="text-[13px] font-medium capitalize mt-0.5" style={{ color: ss.color === "text-amber-800" ? "#92400E" : ss.color === "text-blue-800" ? "#1E40AF" : ss.color === "text-green-800" ? "#166534" : "#991B1B" }}>{status}</p>
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
