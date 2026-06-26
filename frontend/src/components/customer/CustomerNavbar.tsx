"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  MapPin,
  Sparkles,
  Heart,
  Crown,
  Home,
  Shield,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: Calendar },
  { label: "Salons", href: "/salons", icon: MapPin },
  { label: "GlamAI", href: "/glamai", icon: Sparkles },
  { label: "Favorites", href: "/favorites", icon: Heart },
  { label: "Subscription", href: "/subscription", icon: Crown },
];

export function CustomerNavbar() {
  const { profile, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowDropdown(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-white border-b border-[#E5E7EB]/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-full">
        {/* LEFT: Logo + Nav */}
        <div className="flex items-center gap-12">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center shrink-0">
            <span className="font-display text-[22px] font-bold text-[#111827] tracking-tight">
              GlamSpot
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-[#EC4899] bg-[#EC4899]/5 font-semibold"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-[-8px] left-2 right-2 h-[2.5px] rounded-full bg-[#EC4899]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* RIGHT: Admin + User + Sign Out */}
        <div className="flex items-center gap-3">
          {/* Admin Link */}
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#EC4899] bg-[#EC4899]/5 hover:bg-[#EC4899]/10 transition-all duration-200"
            >
              <Shield size={15} />
              Admin
            </Link>
          )}

          {/* User Avatar + Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full hover:bg-[#F9FAFB] transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center text-white text-sm font-semibold overflow-hidden shadow-sm ring-2 ring-white shrink-0">
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
              <span className="hidden md:block text-sm font-medium text-[#374151]">
                {profile?.full_name || "User"}
              </span>
              <ChevronDown
                size={14}
                className={`text-[#9CA3AF] transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E5E7EB]/60 py-2 z-50 modal-in">
                  <div className="px-4 py-2.5 border-b border-[#E5E7EB]/60">
                    <p className="text-sm font-semibold text-[#111827]">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {profile?.role === "salon_owner"
                        ? "Salon Owner"
                        : profile?.role === "admin"
                        ? "Admin"
                        : "Member"}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#EC4899] hover:bg-[#EC4899]/5 transition"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Shield size={14} />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { setShowDropdown(false); signOut(); }}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition w-full text-left"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Desktop Sign Out */}
          <button
            onClick={signOut}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#EF4444] hover:bg-[#FEF2F2] transition-all duration-200"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl border-none bg-transparent cursor-pointer text-[#374151]"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-20 left-0 right-0 bg-white border-b border-[#E5E7EB]/60 shadow-lg z-50 p-6 flex flex-col gap-1 customer-nav-mobile">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-[#EC4899] bg-[#EC4899]/5 font-semibold"
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFB]"
                  }`}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.label}
                </Link>
              );
            })}
            <div className="border-t border-[#E5E7EB]/60 mt-2 pt-2">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#111827] hover:bg-[#FAFAFB] transition"
              >
                Profile Settings
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#FEF2F2] transition w-full text-left"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
