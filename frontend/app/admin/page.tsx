"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  Shield, Users, Store, CreditCard, FileCheck, TrendingUp,
  Loader2, Star, Calendar, Crown, ArrowUpRight, UserCheck,
  ShoppingBag, MessageSquare, DollarSign, Clock, AlertTriangle,
  ThumbsUp, ThumbsDown,
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
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-[#111] text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-[#6B7280] text-[14px]">Admin Only</p>
        </div>
      </div>
    );
  }

  const s = data?.stats;

  const statCards = [
    { label: "Total Users", value: s?.totalUsers ?? "—", icon: Users, color: "#3B82F6", bg: "bg-blue-50", href: "/admin/users" },
    { label: "Customers", value: s?.totalCustomers ?? "—", icon: UserCheck, color: "#22C55E", bg: "bg-green-50", href: "/admin/users" },
    { label: "Salon Owners", value: s?.totalSalonOwners ?? "—", icon: Store, color: "#8B5CF6", bg: "bg-purple-50", href: "/admin/users" },
    { label: "Total Salons", value: s?.totalSalons ?? "—", icon: ShoppingBag, color: "#F59E0B", bg: "bg-amber-50", href: "/admin/salons" },
    { label: "Claimed Salons", value: s?.claimedSalons ?? "—", icon: Crown, color: "#EC4899", bg: "bg-pink-50", href: "/admin/salons" },
    { label: "Unclaimed Salons", value: s?.unclaimedSalons ?? "—", icon: Store, color: "#6B7280", bg: "bg-gray-100", href: "/admin/salons" },
    { label: "Active Owners", value: s?.activeOwners ?? "—", icon: UserCheck, color: "#8B5CF6", bg: "bg-violet-50", href: "/admin/salon-owners" },
    { label: "Pending Claims", value: s?.pendingClaims ?? "—", icon: FileCheck, color: "#F43F5E", bg: "bg-rose-50", href: "/admin/claims" },
    { label: "Bookings Today", value: s?.bookingsToday ?? "—", icon: Calendar, color: "#6366F1", bg: "bg-indigo-50", href: "/admin/bookings" },
    { label: "Bookings This Month", value: s?.bookingsThisMonth ?? "—", icon: Clock, color: "#14B8A6", bg: "bg-teal-50", href: "/admin/bookings" },
    { label: "Total Revenue", value: `₹${(s?.totalRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "#10B981", bg: "bg-emerald-50", href: "/admin/analytics" },
    { label: "Monthly Revenue", value: `₹${(s?.monthlyRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "#F59E0B", bg: "bg-amber-50", href: "/admin/analytics" },
    { label: "Total Reviews", value: s?.totalReviews ?? "—", icon: MessageSquare, color: "#3B82F6", bg: "bg-blue-50", href: "/admin/reviews" },
    { label: "Avg Rating", value: s?.averageRating ?? "—", icon: Star, color: "#F59E0B", bg: "bg-amber-50", href: "/admin/reviews" },
  ];

  const statusColor: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700", confirmed: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700", cancelled: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={22} className="text-[#FF4FA2]" />
          <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Dashboard</h1>
        </div>
        <p className="text-[14px] text-[#6B7280]">Welcome back, {profile?.full_name || "Admin"}.</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {data?.stats.pendingClaims ? (
        <Link href="/admin/claims" className="block mb-6 p-4 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 hover:border-rose-300 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-rose-800">
                {data.stats.pendingClaims} Pending Claim{data.stats.pendingClaims !== 1 ? "s" : ""} Require{data.stats.pendingClaims === 1 ? "s" : ""} Your Attention
              </p>
              <p className="text-[12px] text-rose-600">Click to review and approve/reject claim requests</p>
            </div>
            <ArrowUpRight size={18} className="text-rose-500 shrink-0" />
          </div>
        </Link>
      ) : null}

      {loading && !data ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          {/* 12 Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-8">
            {statCards.map((card) => (
              <Link key={card.label} href={card.href} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.bg}`}>
                  <card.icon size={15} style={{ color: card.color }} />
                </div>
                <p className="text-lg font-bold text-[#111]">{card.value}</p>
                <p className="text-[11px] text-[#6B7280] font-medium">{card.label}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Pending Claims */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#111] text-[15px]">Pending Claims</h3>
                <Link href="/admin/claims" className="text-[12px] text-[#FF4FA2] font-medium hover:underline">View all</Link>
              </div>
              {!data?.pendingClaimsList?.length ? (
                <p className="text-[13px] text-[#6B7280] py-8 text-center">No pending claims.</p>
              ) : (
                <div className="space-y-3">
                  {data.pendingClaimsList.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <FileCheck size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111] truncate">{c.salon}</p>
                        <p className="text-[12px] text-[#6B7280]">{c.owner} • {c.email}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{new Date(c.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#111] text-[15px]">Recent Bookings</h3>
                <Link href="/admin/bookings" className="text-[12px] text-[#FF4FA2] font-medium hover:underline">View all</Link>
              </div>
              {!data?.recentBookings?.length ? (
                <p className="text-[13px] text-[#6B7280] py-8 text-center">No recent bookings.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentBookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{b.customer || "Guest"}</p>
                        <p className="text-[11px] text-[#6B7280]">{b.salon} • {b.date}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[b.status] || "bg-gray-50 text-gray-700"}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reviews */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#111] text-[15px]">Recent Reviews</h3>
                <Link href="/admin/reviews" className="text-[12px] text-[#FF4FA2] font-medium hover:underline">View all</Link>
              </div>
              {!data?.recentReviews?.length ? (
                <p className="text-[13px] text-[#6B7280] py-8 text-center">No recent reviews.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentReviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-0.5 text-[11px] shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={11} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[#111] truncate">{r.user} at {r.salon}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{r.comment || "No comment"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Users, Top Salons, Most Booked, Lowest Rated */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Recent Users */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#111] text-[15px]">Recent Users</h3>
                <Link href="/admin/users" className="text-[12px] text-[#FF4FA2] font-medium hover:underline">View all</Link>
              </div>
              {!data?.recentUsers?.length ? (
                <p className="text-[13px] text-[#6B7280] py-8 text-center">No recent users.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{u.name || "Unknown"}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{u.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        u.role === "admin" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        u.role === "salon_owner" ? "bg-green-50 text-green-700 border-green-200" :
                        "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>{u.role.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue Snapshot */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-[#111] text-[15px] mb-4">Revenue Snapshot</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                  <p className="text-[11px] text-emerald-700 font-medium mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-800">₹{(s?.totalRevenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                  <p className="text-[11px] text-amber-700 font-medium mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-amber-800">₹{(s?.monthlyRevenue ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                  <p className="text-[11px] text-blue-700 font-medium mb-1">Total Bookings</p>
                  <p className="text-2xl font-bold text-blue-800">{s?.bookingsThisMonth ?? 0}<span className="text-sm font-medium text-blue-600 ml-1">this month</span></p>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                  <p className="text-[11px] text-purple-700 font-medium mb-1">Avg Rating</p>
                  <p className="text-2xl font-bold text-purple-800">{s?.averageRating ?? "—"}<span className="text-sm font-medium text-purple-600 ml-1">/ 5.0</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Salons, Most Booked, Lowest Rated */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Top Performing Salons */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp size={16} className="text-green-600" />
                <h3 className="font-semibold text-[#111] text-[15px]">Top Rated Salons</h3>
              </div>
              {!data?.topSalons?.length ? (
                <p className="text-[13px] text-[#6B7280] py-6 text-center">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.topSalons.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{s.name}</p>
                        <p className="text-[11px] text-[#6B7280]">Owner: {s.owner || "Unassigned"}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[13px] font-bold text-amber-600">
                        <Star size={12} className="fill-amber-400 text-amber-400" />{s.rating}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Booked Salons */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag size={16} className="text-blue-600" />
                <h3 className="font-semibold text-[#111] text-[15px]">Most Booked Salons</h3>
              </div>
              {!data?.mostBookedSalons?.length ? (
                <p className="text-[13px] text-[#6B7280] py-6 text-center">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.mostBookedSalons.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{s.name}</p>
                      </div>
                      <span className="text-[13px] font-bold text-blue-600">{s.bookings}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lowest Rated Salons */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ThumbsDown size={16} className="text-red-600" />
                <h3 className="font-semibold text-[#111] text-[15px]">Lowest Rated Salons</h3>
              </div>
              {!data?.lowestRatedSalons?.length ? (
                <p className="text-[13px] text-[#6B7280] py-6 text-center">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.lowestRatedSalons.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111] truncate">{s.name}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[13px] font-bold text-red-500">
                        <Star size={12} className="fill-red-400 text-red-400" />{s.rating}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
