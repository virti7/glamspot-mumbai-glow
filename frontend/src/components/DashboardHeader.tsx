"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, LayoutDashboard, Shield } from "lucide-react";

export function DashboardHeader() {
  const { profile, signOut, isSalonOwner, isAdmin } = useAuth();

  return (
    <header className="bg-white border-b border-[#E8E8E8] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={isSalonOwner ? "/salon-dashboard" : "/dashboard"} className="font-display font-bold text-[#111] text-xl tracking-tight">
            GlamSpot
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-8">
            {isSalonOwner ? (
              <>
                <Link href="/salon-dashboard" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Dashboard</Link>
                <Link href="/salon-dashboard/bookings" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Bookings</Link>
                <Link href="/salon-dashboard/customers" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Customers</Link>
                <Link href="/salon-dashboard/services" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Services</Link>
                <Link href="/salon-dashboard/analytics" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Analytics</Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Dashboard</Link>
                <Link href="/bookings" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Bookings</Link>
                <Link href="/salons" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Salons</Link>
                <Link href="/glamai" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">GlamAI</Link>
                <Link href="/favorites" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Favorites</Link>
                <Link href="/subscription" className="text-[13px] text-[#6B7280] hover:text-[#111] transition">Subscription</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-[#FF4FA2] border border-[#FF4FA2]/30 hover:bg-pink-50 transition"
            >
              <Shield size={14} />
              Admin
            </Link>
          )}
          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8E8E8] text-[13px] text-[#333] hover:border-[#111] transition"
          >
            <User size={14} />
            {profile?.full_name || "Profile"}
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-red-500 hover:bg-red-50 transition"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
