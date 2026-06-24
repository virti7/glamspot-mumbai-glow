"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Sparkles, Loader2, Shield, Scan, TrendingUp, Users, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GlamAIData {
  totalScans: number;
  todayScans: number;
  premiumScans: number;
  premiumConversions: number;
  revenueFromAI: number;
  charts: {
    dailyUsage: Record<string, number>;
    monthlyUsage: Record<string, number>;
    subConversions: Record<string, number>;
  };
}

export default function AdminGlamAIPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<GlamAIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    api.get<GlamAIData>("/admin/glam-ai")
      .then(setData)
      .catch(() => setError("Failed to load Glam AI data"))
      .finally(() => setLoading(false));
  }, [profile]);

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

  const trendToData = (trend: Record<string, number>) =>
    Object.entries(trend).map(([date, value]) => ({ date, value }));

  const cards = data ? [
    { label: "Total Scans", value: data.totalScans.toLocaleString(), icon: Scan, color: "#8B5CF6", bg: "bg-purple-50" },
    { label: "Today's Scans", value: data.todayScans.toLocaleString(), icon: Sparkles, color: "#3B82F6", bg: "bg-blue-50" },
    { label: "Premium Scans", value: data.premiumScans.toLocaleString(), icon: TrendingUp, color: "#F59E0B", bg: "bg-amber-50" },
    { label: "Premium Conversions", value: data.premiumConversions.toLocaleString(), icon: Users, color: "#22C55E", bg: "bg-green-50" },
    { label: "Revenue From AI", value: `₹${data.revenueFromAI.toLocaleString()}`, icon: DollarSign, color: "#EC4899", bg: "bg-pink-50" },
  ] : [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={24} className="text-[#FF4FA2]" />
        <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Glam AI Analytics</h1>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading || !data ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {cards.map((card) => (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">Daily AI Usage</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendToData(data.charts.dailyUsage)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">Monthly AI Usage</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendToData(data.charts.monthlyUsage)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-[#111] text-[14px] mb-4">Subscription Conversions</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendToData(data.charts.subConversions)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#22C55E" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
