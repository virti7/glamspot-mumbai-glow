"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Sparkles, Loader2, Shield, Scan, TrendingUp, Users, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GlamAIData {
  totalScans: number; todayScans: number; premiumScans: number; premiumConversions: number; revenueFromAI: number;
  charts: { dailyUsage: Record<string, number>; monthlyUsage: Record<string, number>; subConversions: Record<string, number>; };
}

export default function AdminGlamAIPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<GlamAIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (profile?.role !== "admin") return; api.get<GlamAIData>("/admin/glam-ai").then(setData).catch(() => setError("Failed to load Glam AI data")).finally(() => setLoading(false)); }, [profile]);

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const trendToData = (trend: Record<string, number>) => Object.entries(trend).map(([date, value]) => ({ date, value }));

  const cards = data ? [
    { label: "Total Scans", value: data.totalScans.toLocaleString(), icon: Scan, color: "#8B5CF6", bg: "bg-purple-50" },
    { label: "Today's Scans", value: data.todayScans.toLocaleString(), icon: Sparkles, color: "#3B82F6", bg: "bg-blue-50" },
    { label: "Premium Scans", value: data.premiumScans.toLocaleString(), icon: TrendingUp, color: "#F59E0B", bg: "bg-amber-50" },
    { label: "Premium Conversions", value: data.premiumConversions.toLocaleString(), icon: Users, color: "#22C55E", bg: "bg-green-50" },
    { label: "Revenue From AI", value: `₹${data.revenueFromAI.toLocaleString()}`, icon: DollarSign, color: "#EC4899", bg: "bg-pink-50" },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-bold text-[#111827] mb-1">Glam AI Analytics</h1></div>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading || !data ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
            {cards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-2.5`}><card.icon size={17} style={{ color: card.color }} /></div>
                <p className="text-[22px] font-bold text-[#111827]">{card.value}</p>
                <p className="text-[11px] text-[#6B7280] font-medium">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Daily AI Usage", data: trendToData(data.charts.dailyUsage), color: "#8B5CF6", type: "bar" as const },
              { title: "Monthly AI Usage", data: trendToData(data.charts.monthlyUsage), color: "#3B82F6", type: "line" as const },
              { title: "Subscription Conversions", data: trendToData(data.charts.subConversions), color: "#22C55E", type: "bar" as const },
            ].map((chart) => (
              <div key={chart.title} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
                <h3 className="text-sm font-semibold text-[#111827] mb-4">{chart.title}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === "bar" ? (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill={chart.color} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
