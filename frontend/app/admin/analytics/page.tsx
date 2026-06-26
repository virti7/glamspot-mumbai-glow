"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type AdminAnalytics } from "@/services/booking.service";
import {
  BarChart3, Loader2, Shield, TrendingUp, Users, Store, Calendar, Star,
  IndianRupee, CreditCard, Clock, Target, UserCheck, Percent, ArrowDownRight,
  RefreshCw, PieChart as PieChartIcon, Activity, DollarSign,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = {
  pink: "#EC4899",
  purple: "#8B5CF6",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  blue: "#3B82F6",
  indigo: "#6366F1",
  teal: "#14B8A6",
  rose: "#F43F5E",
  slate: "#64748B",
};

const PIE_COLORS = [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.green, COLORS.amber, COLORS.red, COLORS.indigo, COLORS.teal];

const periods = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "1y", label: "1 Year" },
];

function MetricCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: any; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2.5`}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="text-[22px] font-bold text-[#111827]">{value}</p>
      <p className="text-[11px] text-[#6B7280] font-medium">{label}</p>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-[#111827] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 animate-pulse">
          <div className="h-9 w-9 bg-gray-200 rounded-xl mb-2.5" />
          <div className="h-7 w-16 bg-gray-200 rounded mb-1" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 shadow-lg">
        <p className="text-[12px] font-medium text-[#111827] mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-[11px]" style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.value > 999 ? `₹${p.value.toLocaleString("en-IN")}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = useCallback(async (p: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await bookingService.adminGetAnalytics(p);
      setData(result);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === "admin") fetchAnalytics(period);
  }, [profile, period, fetchAnalytics]);

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-[22px] font-bold text-[#111827] mb-2">Access Denied</h2>
          <p className="text-[14px] text-[#6B7280]">Admin Only</p>
        </div>
      </div>
    );
  }

  const o = data?.overview;
  const metricCards = o ? [
    { label: "Total Bookings", value: o.totalBookings, icon: Calendar, color: COLORS.pink, bg: "bg-pink-50" },
    { label: "Total Revenue", value: `₹${o.totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: COLORS.green, bg: "bg-green-50" },
    { label: "Platform Fees", value: `₹${o.totalPlatformFees.toLocaleString("en-IN")}`, icon: DollarSign, color: COLORS.purple, bg: "bg-purple-50" },
    { label: "Total Refunds", value: `₹${o.totalRefunds.toLocaleString("en-IN")}`, icon: ArrowDownRight, color: COLORS.red, bg: "bg-red-50" },
    { label: "Avg Booking Value", value: `₹${o.averageBookingValue.toLocaleString("en-IN")}`, icon: Target, color: COLORS.amber, bg: "bg-amber-50" },
    { label: "Avg Duration", value: `${o.averageDuration} min`, icon: Clock, color: COLORS.blue, bg: "bg-blue-50" },
    { label: "Payment Success", value: `${o.paymentSuccessRate}%`, icon: CreditCard, color: COLORS.green, bg: "bg-emerald-50" },
    { label: "Cancellation Rate", value: `${o.cancellationRate}%`, icon: Activity, color: COLORS.red, bg: "bg-rose-50" },
    { label: "Refund Rate", value: `${o.refundRate}%`, icon: Percent, color: COLORS.amber, bg: "bg-orange-50" },
    { label: "New Customers", value: o.newCustomers, icon: UserCheck, color: COLORS.blue, bg: "bg-indigo-50" },
    { label: "Repeat Customers", value: o.repeatCustomers, icon: Users, color: COLORS.teal, bg: "bg-teal-50" },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Analytics</h1>
          <p className="text-sm text-[#6B7280]">Platform performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {periods.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${
                  period === p.key ? "bg-[#111827] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-[#EC4899]/30"
                }`}
              >{p.label}</button>
            ))}
          </div>
          <button onClick={() => fetchAnalytics(period)} disabled={loading}
            className="p-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#FAFAFB] transition-all disabled:opacity-50 cursor-pointer">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#9CA3AF]" : "text-[#6B7280]"} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
          {error}
        </div>
      )}

      {loading || !data ? (
        <>
          <SkeletonCards />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <SkeletonChart /><SkeletonChart /><SkeletonChart /><SkeletonChart />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 mb-6">
            {metricCards.map((card) => <MetricCard key={card.label} {...card} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartCard title="Revenue Trend">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.revenueTrend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Revenue" stroke={COLORS.green} strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Booking Trend">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.bookingTrend}>
                    <defs>
                      <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.pink} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS.pink} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Bookings" stroke={COLORS.pink} strokeWidth={2} fill="url(#bookGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Platform Fee Trend">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.platformFeeTrend}>
                    <defs>
                      <linearGradient id="feeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Platform Fees" stroke={COLORS.purple} strokeWidth={2} fill="url(#feeGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Booking Status Distribution">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.distributions.bookingStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                      {data.distributions.bookingStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.status === "completed" ? COLORS.green : entry.status === "cancelled" ? COLORS.red : entry.status === "pending" ? COLORS.amber : entry.status === "confirmed" ? COLORS.blue : COLORS.pink} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ChartCard title="Booking Source Distribution">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.distributions.bookingSource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}>
                      {data.distributions.bookingSource.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Payment Method Distribution">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.distributions.paymentMethod} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}>
                      {data.distributions.paymentMethod.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Payment Status Distribution">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.distributions.paymentStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                      {data.distributions.paymentStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.status === "completed" || entry.status === "paid" ? COLORS.green : entry.status === "pending" ? COLORS.amber : entry.status === "refunded" ? COLORS.slate : COLORS.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartCard title="Top Salons by Revenue">
              <div className="h-72">
                {data.topSalons.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF] text-center py-12">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topSalons} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" name="Revenue" fill={COLORS.green} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Top Services by Bookings">
              <div className="h-72">
                {data.topServices.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF] text-center py-12">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topServices} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Bookings" fill={COLORS.pink} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartCard title="Peak Booking Hours">
              <div className="h-64">
                {data.peakHours.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF] text-center py-12">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.peakHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Bookings" fill={COLORS.indigo} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Peak Booking Days">
              <div className="h-64">
                {data.peakDays.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF] text-center py-12">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.peakDays}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Bookings" fill={COLORS.teal} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {[
              { title: "User Growth", data: data.charts.userGrowth, color: COLORS.blue, id: "usrGrad" },
              { title: "Salon Growth", data: data.charts.salonGrowth, color: COLORS.green, id: "salGrad" },
              { title: "Review Growth", data: data.charts.reviewGrowth, color: COLORS.pink, id: "revGrad2" },
            ].map((chart) => (
              <ChartCard key={chart.title} title={chart.title}>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart.data}>
                      <defs>
                        <linearGradient id={chart.id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chart.color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="value" name="Count" stroke={chart.color} strokeWidth={2} fill={`url(#${chart.id})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
