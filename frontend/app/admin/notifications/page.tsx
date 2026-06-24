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

  const totalUnread = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;

  const notificationItems = [
    { label: "Pending Claims", value: data?.pendingClaims ?? 0, icon: FileCheck, color: "#F59E0B", bg: "bg-amber-50", href: "/admin/claims", desc: "Salon ownership claims awaiting review" },
    { label: "New Salons", value: data?.newSalons ?? 0, icon: Store, color: "#22C55E", bg: "bg-green-50", href: "/admin/salons", desc: "Salons registered in the last 7 days" },
    { label: "New Reviews", value: data?.newReviews ?? 0, icon: MessageSquare, color: "#3B82F6", bg: "bg-blue-50", href: "/admin/reviews", desc: "Reviews submitted in the last 7 days" },
    { label: "New Bookings", value: data?.newBookings ?? 0, icon: Calendar, color: "#EC4899", bg: "bg-pink-50", href: "/admin/bookings", desc: "Bookings made today" },
    { label: "New Users", value: data?.newUsers ?? 0, icon: Users, color: "#8B5CF6", bg: "bg-purple-50", href: "/admin/users", desc: "Users registered in the last 7 days" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Bell size={24} className="text-[#FF4FA2]" />
          <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Notifications</h1>
          {totalUnread > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-[#FF4FA2] text-white text-[11px] font-bold">
              {totalUnread} unread
            </span>
          )}
        </div>
        <p className="text-[13px] text-[#6B7280]">Auto-refreshes every 30 seconds</p>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notificationItems.map((item) => (
            <Link key={item.label} href={item.href} className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg}`}>
                  <item.icon size={22} style={{ color: item.color }} />
                </div>
                <span className={`text-2xl font-bold ${item.value > 0 ? "text-[#111]" : "text-gray-300"}`}>
                  {item.value}
                </span>
              </div>
              <h3 className="font-semibold text-[#111] text-[15px]">{item.label}</h3>
              <p className="text-[12px] text-[#6B7280] mt-1">{item.desc}</p>
              <div className="flex items-center gap-1 text-[12px] text-[#FF4FA2] font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                View details <ArrowUpRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
