"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Scissors, Users, Image, Star,
  UserCircle, BarChart3, Settings, LogOut, ChevronLeft, Menu,
  Store, Clock, Shield, Loader2,
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
  const [ownershipVerified, setOwnershipVerified] = useState(false);

  useEffect(() => {
    if (!loading && !profile) {
      router.push("/auth/login");
      return;
    }
    if (loading || !profile) return;
    if (isAdmin) { setOwnershipVerified(true); return; }
    fetch("/api/salons/owner")
      .then((res) => {
        if (res.status === 404) {
          router.push("/?reason=ownership_removed");
        } else {
          setOwnershipVerified(true);
        }
      })
      .catch(() => { setOwnershipVerified(true); });
  }, [loading, profile, isAdmin, router]);

  if (loading || !profile || !ownershipVerified) {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] bg-white border-r border-[#E5E7EB]/60 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-[#E5E7EB]/60">
          <Link href="/salon-dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center shadow-md shadow-[#EC4899]/20">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-[#111827] text-base">Salon Dashboard</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#EC4899]/8 text-[#EC4899] font-semibold"
                    : "text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827]"
                }`}
              >
                <link.icon size={18} className={isActive ? "text-[#EC4899]" : "text-[#9CA3AF]"} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]/60 space-y-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#EC4899] hover:bg-[#EC4899]/5 transition-all duration-200 w-full"
            >
              <Shield size={18} />
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => { signOut(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#EF4444] transition-all duration-200 w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-[#6B7280] hover:bg-[#FAFAFB] transition-colors">
              <Menu size={22} />
            </button>
            <Link href="/salon-dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center">
                <Store size={14} className="text-white" />
              </div>
              <span className="font-bold text-[#111827] text-[14px]">Salon Dashboard</span>
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
