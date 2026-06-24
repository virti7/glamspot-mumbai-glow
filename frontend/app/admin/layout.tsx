"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Store, FileCheck, UserCheck, Users,
  Calendar, DollarSign, MessageSquare, BarChart3, Settings,
  Bell, LogOut, Menu, Crown, Shield, Search, History,
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
  { label: "Salon Owners", href: "/admin/salon-owners", icon: UserCheck, badge: null as const },
  { label: "Ownership History", href: "/admin/ownership-history", icon: History, badge: null as const },
  { label: "Users", href: "/admin/users", icon: Users, badge: "newUsers" as const },
  { label: "Bookings", href: "/admin/bookings", icon: Calendar, badge: "newBookings" as const },
  { label: "Payments", href: "/admin/payments", icon: DollarSign, badge: null as const },
  { label: "Reviews", href: "/admin/reviews", icon: MessageSquare, badge: "newReviews" as const },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, badge: null as const },
  { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: null as const },
  { label: "Settings", href: "/admin/settings", icon: Settings, badge: null as const },
];

const statusColors: Record<string, string> = {
  pendingClaims: "bg-rose-500",
  newSalons: "bg-emerald-500",
  newUsers: "bg-blue-500",
  newBookings: "bg-violet-500",
  newReviews: "bg-amber-500",
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

  const fetchNotifications = useCallback(() => {
    api.get<Notifications>("/admin/notifications").then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const channel = supabase
      .channel("admin-claims-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "salon_claims" }, () => fetchNotifications())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salon_claims" }, () => fetchNotifications())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchNotifications]);

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) return <>{children}</>;

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
          <span className="text-[13px] text-gray-400 font-medium">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  const totalUnread = Object.values(notifications).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[272px] bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm shadow-rose-200">
              <Crown size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-[15px] text-gray-900">GlamSpot</span>
              <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
            const badgeCount = link.badge ? notifications[link.badge] : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all relative group ${
                  isActive
                    ? "bg-rose-50 text-rose-600 font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <link.icon size={18} className={isActive ? "text-rose-500" : "text-gray-400 group-hover:text-gray-600"} />
                <span>{link.label}</span>
                {badgeCount > 0 && (
                  <span className={`ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1.5 ${statusColors[link.badge!]}`}>
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-rose-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{profile?.full_name || "Admin"}</p>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Shield size={10} />
                Founder
              </p>
            </div>
            {totalUnread > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-500 hover:text-gray-700">
                <Menu size={20} />
              </button>
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <Crown size={14} className="text-white" />
                </div>
                <span className="font-bold text-[14px] text-gray-900">Admin</span>
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search anything..."
                  className="w-64 pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition relative">
                <Bell size={18} />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-white">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <span className="text-[13px] font-medium text-gray-700 hidden sm:block">{profile?.full_name || "Admin"}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
