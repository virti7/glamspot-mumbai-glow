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
  Bell, LogOut, Menu, Crown, Shield, Search, History, X,
} from "lucide-react";

interface Notifications {
  pendingClaims: number;
  newSalons: number;
  newReviews: number;
  newBookings: number;
  newUsers: number;
}

const navGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, badge: null },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Claims", href: "/admin/claims", icon: FileCheck, badge: "pendingClaims" },
      { label: "Salons", href: "/admin/salons", icon: Store, badge: "newSalons" },
      { label: "Salon Owners", href: "/admin/salon-owners", icon: UserCheck, badge: null },
      { label: "Ownership History", href: "/admin/ownership-history", icon: History, badge: null },
      { label: "Users", href: "/admin/users", icon: Users, badge: "newUsers" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: Calendar, badge: "newBookings" },
      { label: "Payments", href: "/admin/payments", icon: DollarSign, badge: null },
      { label: "Reviews", href: "/admin/reviews", icon: MessageSquare, badge: "newReviews" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3, badge: null },
      { label: "Glam AI", href: "/admin/glam-ai", icon: Crown, badge: null },
      { label: "Notifications", href: "/admin/notifications", icon: Bell, badge: null },
      { label: "Settings", href: "/admin/settings", icon: Settings, badge: null },
    ],
  },
];

const badgeColors: Record<string, string> = {
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-200 border-t-[#EC4899] rounded-full animate-spin" />
          <span className="text-[13px] text-gray-400 font-medium">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  const totalUnread = Object.values(notifications).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex bg-[#FAFAFB]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col bg-white border-r border-[#E5E7EB]/60 transition-transform duration-300 overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: 280 }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-[#E5E7EB]/60">
          <Link href="/admin" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center shadow-md shadow-[#EC4899]/20">
              <Crown size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-[15px] text-[#111827]">GlamSpot</span>
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-semibold mt-0.5">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-3 mb-1.5">
                {group.label}
              </p>
              {group.items.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                const badgeCount = link.badge ? notifications[link.badge as keyof Notifications] : 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 no-underline mb-0.5 relative ${
                      isActive
                        ? "bg-[#EC4899]/8 text-[#EC4899] font-semibold"
                        : "text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827]"
                    }`}
                  >
                    <link.icon
                      size={17}
                      className={`flex-shrink-0 ${
                        isActive ? "text-[#EC4899]" : "text-[#9CA3AF]"
                      }`}
                    />
                    <span className="flex-1">{link.label}</span>
                    {badgeCount > 0 && (
                      <span
                        className={`min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1.5 ${
                          badgeColors[link.badge!] || "bg-[#EC4899]"
                        }`}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-[#E5E7EB]/60">
          <div className="flex items-center gap-2.5 mb-2.5 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111827] truncate">
                {profile?.full_name || "Admin"}
              </p>
              <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                <Shield size={10} />
                Administrator
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[#E5E7EB]/60 h-[72px]">
          <div className="flex items-center justify-between h-full px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border-none bg-transparent cursor-pointer text-[#6B7280]"
            >
              <Menu size={20} />
            </button>

            {/* Search Bar - Centered */}
            <div className="admin-search-desktop flex-1 max-w-md mx-auto relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                placeholder="Search anything..."
                className="max-w-md w-full h-11 rounded-xl bg-[#FAFAFB] border border-[#E5E7EB] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] focus:bg-white transition-all"
              />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-[#FAFAFB] transition-all">
                <Bell size={19} />
                {totalUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-[#EC4899] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    {totalUnread > 9 ? "9+" : totalUnread}
                  </span>
                )}
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-2.5 p-1 pl-1 pr-3 rounded-xl cursor-default">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-sm font-bold flex items-center justify-center">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <span className="admin-nav-username text-[13px] font-medium text-[#374151]">
                  {profile?.full_name || "Admin"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-6 lg:p-8 w-full mx-auto" style={{ maxWidth: 1600 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
