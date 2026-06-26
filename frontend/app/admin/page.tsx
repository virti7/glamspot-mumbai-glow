"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  Shield, Users, Store, FileCheck, TrendingUp,
  Loader2, Star, Calendar, Crown, ArrowUpRight, UserCheck,
  ShoppingBag, MessageSquare, DollarSign, Clock, AlertTriangle,
  ThumbsUp, ThumbsDown, RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalUsers: number; totalCustomers: number; totalSalonOwners: number;
    totalSalons: number; claimedSalons: number; unclaimedSalons: number;
    activeOwners: number; pendingClaims: number;
    bookingsToday: number; bookingsThisMonth: number;
    totalRevenue: number; monthlyRevenue: number;
    totalReviews: number; averageRating: string;
  };
  recentBookings: { id: string; salon: string; customer: string; date: string; time: string; status: string; amount: number }[];
  recentReviews: { id: string; salon: string; user: string; rating: number; comment: string; date: string }[];
  recentUsers: { id: string; name: string; email: string; role: string; date: string }[];
  pendingClaimsList: { id: string; salon: string; salonSlug: string; owner: string; email: string; phone: string; date: string }[];
  topSalons: { id: string; name: string; slug: string; rating: number; owner: string | null }[];
  mostBookedSalons: { id: string; name: string; slug: string; bookings: number }[];
  lowestRatedSalons: { id: string; name: string; slug: string; rating: number }[];
}

function AnimatedNumber({ value }: { value: number | string }) {
  return <span>{value}</span>;
}

const statusColor: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-800" },
  confirmed: { bg: "bg-blue-100", text: "text-blue-800" },
  completed: { bg: "bg-green-100", text: "text-green-800" },
  cancelled: { bg: "bg-red-100", text: "text-red-800" },
  checked_in: { bg: "bg-purple-100", text: "text-purple-800" },
  in_progress: { bg: "bg-indigo-100", text: "text-indigo-800" },
};

export default function AdminPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    api.get<DashboardData>("/admin/dashboard")
      .then(setData)
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [profile]);

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

  const s = data?.stats;

  const statCards = [
    { label: "Total Users", value: s?.totalUsers ?? 0, icon: Users, color: "#3B82F6", bg: "bg-blue-50", href: "/admin/users" },
    { label: "Customers", value: s?.totalCustomers ?? 0, icon: UserCheck, color: "#22C55E", bg: "bg-green-50", href: "/admin/users" },
    { label: "Salon Owners", value: s?.totalSalonOwners ?? 0, icon: Store, color: "#8B5CF6", bg: "bg-purple-50", href: "/admin/users" },
    { label: "Total Salons", value: s?.totalSalons ?? 0, icon: ShoppingBag, color: "#F59E0B", bg: "bg-amber-50", href: "/admin/salons" },
    { label: "Pending Claims", value: s?.pendingClaims ?? 0, icon: FileCheck, color: "#EF4444", bg: "bg-red-50", href: "/admin/claims" },
    { label: "Bookings Today", value: s?.bookingsToday ?? 0, icon: Calendar, color: "#6366F1", bg: "bg-indigo-50", href: "/admin/bookings" },
    { label: "Monthly Revenue", value: `₹${(s?.monthlyRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "#10B981", bg: "bg-emerald-50", href: "/admin/analytics" },
    { label: "Total Reviews", value: s?.totalReviews ?? 0, icon: MessageSquare, color: "#EC4899", bg: "bg-pink-50", href: "/admin/reviews" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Dashboard</h1>
          <p className="text-sm text-[#6B7280]">Welcome back, {profile?.full_name || "Admin"}.</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      {/* Pending Claims Alert */}
      {data?.stats.pendingClaims ? (
        <Link
          href="/admin/claims"
          className="block mb-6 p-4 bg-gradient-to-r from-[#FFF1F2] to-[#FFE4E6] border border-[#FECDD3] rounded-2xl no-underline hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-[#EF4444]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#991B1B]">
                {data.stats.pendingClaims} Pending Claim{data.stats.pendingClaims !== 1 ? "s" : ""} Require{data.stats.pendingClaims === 1 ? "s" : ""} Attention
              </p>
              <p className="text-[12px] text-[#DC2626]">Click to review and approve/reject</p>
            </div>
            <ArrowUpRight size={18} className="text-[#EF4444]" />
          </div>
        </Link>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 size={24} className="text-gray-300 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 no-underline hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold text-[#111827] mb-0.5">
                  <AnimatedNumber value={card.value} />
                </p>
                <p className="text-xs font-medium text-[#6B7280]">{card.label}</p>
              </Link>
            ))}
          </div>

          {/* 3-Column Grid: Claims, Bookings, Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Pending Claims */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#111827]">Pending Claims</h3>
                <Link href="/admin/claims" className="text-xs font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors">View all</Link>
              </div>
              {!data?.pendingClaimsList?.length ? (
                <p className="text-sm text-[#9CA3AF] text-center py-8">No pending claims.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.pendingClaimsList.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FFFBFB] border border-[#FEE2E2]">
                      <FileCheck size={16} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] truncate">{c.salon}</p>
                        <p className="text-[11px] text-[#6B7280]">{c.owner}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#111827]">Recent Bookings</h3>
                <Link href="/admin/bookings" className="text-xs font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors">View all</Link>
              </div>
              {!data?.recentBookings?.length ? (
                <p className="text-sm text-[#9CA3AF] text-center py-8">No recent bookings.</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {data.recentBookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#FAFAFB] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111827] truncate">{b.customer || "Guest"}</p>
                        <p className="text-[11px] text-[#6B7280]">{b.salon}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          statusColor[b.status]?.bg || "bg-gray-100"
                        } ${statusColor[b.status]?.text || "text-gray-600"}`}
                      >
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#111827]">Recent Reviews</h3>
                <Link href="/admin/reviews" className="text-xs font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors">View all</Link>
              </div>
              {!data?.recentReviews?.length ? (
                <p className="text-sm text-[#9CA3AF] text-center py-8">No recent reviews.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.recentReviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-[#FAFAFB]">
                      <div className="flex items-center gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={11} className={star <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                      <p className="text-[12px] font-medium text-[#111827] truncate">{r.user} at {r.salon}</p>
                      <p className="text-[11px] text-[#6B7280] truncate">{r.comment || "No comment"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2-Column: Users + Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Recent Users */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#111827]">Recent Users</h3>
                <Link href="/admin/users" className="text-xs font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors">View all</Link>
              </div>
              {!data?.recentUsers?.length ? (
                <p className="text-sm text-[#9CA3AF] text-center py-8">No recent users.</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {data.recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl hover:bg-[#FAFAFB] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111827] truncate">{u.name || "Unknown"}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{u.email}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.role === "admin" ? "bg-amber-100 text-amber-800" : u.role === "salon_owner" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue Snapshot */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Revenue Snapshot</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Revenue", value: `₹${(s?.totalRevenue ?? 0).toLocaleString()}`, color: "#10B981", bg: "bg-emerald-50" },
                  { label: "Monthly Revenue", value: `₹${(s?.monthlyRevenue ?? 0).toLocaleString()}`, color: "#F59E0B", bg: "bg-amber-50" },
                  { label: "Total Bookings", value: `${s?.bookingsThisMonth ?? 0}`, sub: "this month", color: "#3B82F6", bg: "bg-blue-50" },
                  { label: "Avg Rating", value: `${s?.averageRating ?? "—"}`, sub: "/ 5.0", color: "#8B5CF6", bg: "bg-purple-50" },
                ].map((item) => (
                  <div key={item.label} className={`p-4 rounded-xl ${item.bg}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: item.color }}>{item.label}</p>
                    <p className="text-[22px] font-bold text-[#111827]">
                      {item.value}
                      {item.sub && <span className="text-[12px] font-medium ml-1" style={{ color: item.color }}>{item.sub}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3-Column: Top Salons, Most Booked, Lowest Rated */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "Top Rated Salons", icon: ThumbsUp, color: "#22C55E", data: data?.topSalons, render: (s: any, i: number) => (
                <>
                  <p className="text-[13px] font-medium text-[#111827] truncate">{s.name}</p>
                  <p className="text-[11px] text-[#6B7280]">Owner: {s.owner || "Unassigned"}</p>
                </>
              ), value: (s: any) => <span className="flex items-center gap-1 text-[13px] font-bold text-amber-400"><Star size={12} className="fill-amber-400 text-amber-400" />{s.rating}</span> },
              { title: "Most Booked Salons", icon: ShoppingBag, color: "#3B82F6", data: data?.mostBookedSalons, render: (s: any) => (
                <p className="text-[13px] font-medium text-[#111827] truncate">{s.name}</p>
              ), value: (s: any) => <span className="text-[13px] font-bold text-[#3B82F6]">{s.bookings}</span> },
              { title: "Lowest Rated Salons", icon: ThumbsDown, color: "#EF4444", data: data?.lowestRatedSalons, render: (s: any) => (
                <p className="text-[13px] font-medium text-[#111827] truncate">{s.name}</p>
              ), value: (s: any) => <span className="flex items-center gap-1 text-[13px] font-bold text-[#EF4444]"><Star size={12} className="fill-red-300 text-red-300" />{s.rating}</span> },
            ].map((section) => (
              <div key={section.title} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <section.icon size={16} style={{ color: section.color }} />
                  <h3 className="text-sm font-semibold text-[#111827]">{section.title}</h3>
                </div>
                {!section.data?.length ? (
                  <p className="text-sm text-[#9CA3AF] text-center py-6">No data yet.</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {section.data.map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl hover:bg-[#FAFAFB] transition-colors">
                        <span className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#6B7280] flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">{section.render(s, i)}</div>
                        {section.value(s)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
