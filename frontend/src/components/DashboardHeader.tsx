"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, LayoutDashboard, Shield, Store } from "lucide-react";

export function DashboardHeader() {
  const { profile, signOut, isSalonOwner, isAdmin } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] px-6 sm:px-8 py-4 mx-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={isSalonOwner ? "/salon-dashboard" : "/dashboard"} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <span className="font-bold text-[#111] text-lg tracking-tight">GlamSpot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {isSalonOwner ? (
              <>
                <Link href="/salon-dashboard" className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Dashboard</Link>
                <Link href="/salon-dashboard/bookings" className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Bookings</Link>
                <Link href="/salon-dashboard/customers" className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Customers</Link>
                <Link href="/salon-dashboard/services" className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Services</Link>
                <Link href="/salon-dashboard/analytics" className="px-3 py-1.5 rounded-xl text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">Analytics</Link>
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-[#FF4FA2] bg-pink-50/80 hover:bg-pink-100 transition-all"
            >
              <Shield size={13} />
              Admin
            </Link>
          )}
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[13px] text-gray-700 hover:border-gray-200 hover:bg-gray-100 transition-all"
          >
            <User size={14} className="text-gray-400" />
            {profile?.full_name || "Profile"}
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={14} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
