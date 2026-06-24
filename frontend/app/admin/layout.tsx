"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  Shield, Store, Users, FileCheck, LayoutDashboard,
  LogOut, Menu, Calendar, MessageSquare, BarChart3, Settings,
  Crown, DollarSign, Sparkles, Bell,
} from "lucide-react";

interface Notifications {
  pendingClaims: number;
  newSalons: number;
  newReviews: number;
  newBookings: number;
  newUsers: number;
}

const sidebarLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, badge: null as const },
  { label: "Claims", href: "/admin/claims", icon: FileCheck, badge: "pendingClaims" as const },
  { label: "Salons", href: "/admin/salons", icon: Store, badge: "newSalons" as const },
  { label: "Users", href: "/admin/users", icon: Users, badge: "newUsers" as const },
  { label: "Bookings", href: "/admin/bookings", icon: Calendar, badge: "newBookings" as const },
  { label: "Payments", href: "/admin/payments", icon: DollarSign, badge: null as const },
  { label: "Reviews", href: "/admin/reviews", icon: MessageSquare, badge: "newReviews" as const },
  { label: "Glam AI", href: "/admin/glam-ai", icon: Sparkles, badge: null as const },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, badge: null as const },
  { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: null as const },
  { label: "Settings", href: "/admin/settings", icon: Settings, badge: null as const },
];

const statusColors: Record<string, string> = {
  pendingClaims: "bg-amber-500",
  newSalons: "bg-green-500",
  newUsers: "bg-blue-500",
  newBookings: "bg-pink-500",
  newReviews: "bg-purple-500",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notifications>({
    pendingClaims: 0, newSalons: 0, newReviews: 0, newBookings: 0, newUsers: 0,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      const fetch = () => api.get<Notifications>("/admin/notifications").then(setNotifications).catch(() => {});
      fetch();
      const interval = setInterval(fetch, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-200 border-t-[#FF4FA2] rounded-full animate-spin" />
          <span className="text-[13px] text-gray-400 font-medium">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  const totalUnread = Object.values(notifications).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF4FA2] to-pink-600 flex items-center justify-center shadow-sm">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-[#111] text-[15px]">Admin</span>
              <p className="text-[10px] text-gray-400 font-medium">Founder Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const badgeCount = link.badge ? notifications[link.badge] : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative ${
                  isActive
                    ? "bg-[#FF4FA2]/10 text-[#FF4FA2]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-[#111]"
                }`}
              >
                <link.icon size={18} />
                {link.label}
                {badgeCount > 0 && (
                  <span className={`ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1.5 ${statusColors[link.badge!]}`}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[#FF4FA2]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF4FA2] to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111] truncate">{profile?.full_name || "Admin"}</p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Crown size={10} />
                Founder
              </p>
            </div>
            {totalUnread > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#FF4FA2] text-white text-[9px] font-bold flex items-center justify-center">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => { signOut(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium text-red-500 hover:bg-red-50 transition-all w-full"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-500">
              <Menu size={22} />
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF4FA2] to-pink-600 flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="font-bold text-[#111] text-[14px]">Admin</span>
            </Link>
            <div className="w-8" />
          </div>
        </div>

        <main className="p-4 md:p-6 lg:p-8 pb-24 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
