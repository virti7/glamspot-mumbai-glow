"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Bell, Loader2, Shield, FileCheck, Store, MessageSquare, Calendar, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface NotificationData {
  pendingClaims: number;
  newSalons: number;
  newReviews: number;
  newBookings: number;
  newUsers: number;
}

export default function AdminNotificationsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    const fetch = () => {
      api.get<NotificationData>("/admin/notifications")
        .then(setData)
        .catch(() => setError("Failed to load notifications"))
        .finally(() => setLoading(false));
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const totalUnread = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;

  const notificationItems = [
    { label: "Pending Claims", value: data?.pendingClaims ?? 0, icon: FileCheck, color: "#F59E0B", bg: "bg-amber-50", href: "/admin/claims", desc: "Salon ownership claims awaiting review" },
    { label: "New Salons", value: data?.newSalons ?? 0, icon: Store, color: "#22C55E", bg: "bg-green-50", href: "/admin/salons", desc: "Salons registered in the last 7 days" },
    { label: "New Reviews", value: data?.newReviews ?? 0, icon: MessageSquare, color: "#3B82F6", bg: "bg-blue-50", href: "/admin/reviews", desc: "Reviews submitted in the last 7 days" },
    { label: "New Bookings", value: data?.newBookings ?? 0, icon: Calendar, color: "#EC4899", bg: "bg-pink-50", href: "/admin/bookings", desc: "Bookings made today" },
    { label: "New Users", value: data?.newUsers ?? 0, icon: Users, color: "#8B5CF6", bg: "bg-purple-50", href: "/admin/users", desc: "Users registered in the last 7 days" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Notifications</h1>
          <p className="text-sm text-[#6B7280]">Auto-refreshes every 30 seconds</p>
        </div>
        {totalUnread > 0 && (
          <span className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[#EC4899] text-white">
            {totalUnread} unread
          </span>
        )}
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notificationItems.map((item) => (
            <Link key={item.label} href={item.href} className="no-underline">
              <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB]/60 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-300 cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                    <item.icon size={22} style={{ color: item.color }} />
                  </div>
                  <span className={`text-[28px] font-bold ${item.value > 0 ? "text-[#111827]" : "text-gray-300"}`}>{item.value}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#111827] mb-1">{item.label}</h3>
                <p className="text-[12px] text-[#6B7280]">{item.desc}</p>
                <div className="flex items-center gap-1 text-[12px] text-[#EC4899] font-medium mt-3 opacity-80">
                  View details <ArrowUpRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
