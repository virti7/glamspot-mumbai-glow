"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Scissors, Users, Image, Star,
  UserCircle, BarChart3, Settings, LogOut, ChevronLeft, Menu,
  Store, Clock, Shield,
} from "lucide-react";

const sidebarLinks = [
  { label: "Dashboard", href: "/salon-dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/salon-dashboard/bookings", icon: Calendar },
  { label: "Services", href: "/salon-dashboard/services", icon: Scissors },
  { label: "Staff", href: "/salon-dashboard/staff", icon: Users },
  { label: "Gallery", href: "/salon-dashboard/gallery", icon: Image },
  { label: "Business Hours", href: "/salon-dashboard/hours", icon: Clock },
  { label: "Reviews", href: "/salon-dashboard/reviews", icon: Star },
  { label: "Customers", href: "/salon-dashboard/customers", icon: UserCircle },
  { label: "Analytics", href: "/salon-dashboard/analytics", icon: BarChart3 },
  { label: "Profile", href: "/salon-dashboard/profile", icon: Settings },
];

export default function SalonDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isSalonOwner, isAdmin, signOut, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isSalonOwner) {
      router.push("/dashboard");
    }
  }, [loading, isSalonOwner, router]);

  if (loading || !isSalonOwner) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-gray-100">
          <Link href="/salon-dashboard" className="flex items-center gap-2">
            <Store size={22} className="text-[#EC4899]" />
            <span className="font-bold text-[#111] text-[16px]">Salon Dashboard</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-[#EC4899]/10 text-[#EC4899]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-[#111]"
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#FF4FA2] hover:bg-pink-50 transition-all w-full"
            >
              <Shield size={18} />
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => { signOut(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-500">
              <Menu size={22} />
            </button>
            <Link href="/salon-dashboard" className="flex items-center gap-2">
              <Store size={18} className="text-[#EC4899]" />
              <span className="font-bold text-[#111] text-[14px]">Salon Dashboard</span>
            </Link>
            <div className="w-8" />
          </div>
        </div>

        <main className="p-4 md:p-6 lg:p-8 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
