"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronDown, LayoutDashboard, Calendar, MapPin, Sparkles, Heart, Crown, Home, Shield } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: Calendar },
  { label: "Salons", href: "/salons", icon: MapPin },
  { label: "GlamAI", href: "/glamai", icon: Sparkles },
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Subscription", href: "/subscription", icon: Crown },
];

export function DashboardNavbar() {
  const { profile, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-20 flex items-center transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-[0_1px_20px_rgba(0,0,0,0.06)]"
          : "bg-white border-b border-gray-100"
      }`}
    >
      <div className="max-w-[1280px] mx-auto w-full px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-[22px] font-bold text-[#111] tracking-tight">
            GlamSpot
          </span>
        </Link>

        {/* Center Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
                  isActive
                    ? "text-[#EC4899]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <item.icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
                {isActive && (
                  <span className="absolute bottom-[-8px] left-2 right-2 h-[2.5px] rounded-full bg-[#EC4899]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Admin Link */}
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#FF4FA2] hover:bg-pink-50 transition-all duration-200"
            >
              <Shield size={15} />
              Admin
            </Link>
          )}

          {/* User Avatar + Name + Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-50 transition-all duration-200"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-sm font-semibold overflow-hidden ring-2 ring-white shadow-sm">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile?.full_name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              <span className="hidden md:block text-[13.5px] font-medium text-gray-700">
                {profile?.full_name || "User"}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 py-2 z-50 modal-in">
                  <div className="px-4 py-2.5 border-b border-gray-50">
                    <p className="text-[13px] font-semibold text-gray-800">{profile?.full_name || "User"}</p>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">
                      {profile?.role === "salon_owner" ? "Salon Owner" : profile?.role === "admin" ? "Admin" : "Member"}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#FF4FA2] hover:bg-pink-50 transition"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Shield size={14} />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { setShowDropdown(false); signOut(); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition w-full text-left"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={signOut}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
