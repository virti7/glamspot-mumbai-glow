"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { userService, type UserStats } from "@/services/user.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Calendar, Heart, Sparkles, Star, CreditCard, User, ChevronRight, Scissors, Clock, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const { profile, subscription, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && profile) {
      userService.getStats()
        .then(setStats)
        .catch(() => setError("Failed to load stats"))
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, profile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-[#999]">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "";

  const statCards = [
    { label: "Total Bookings", value: stats?.totalBookings ?? 0, icon: Calendar, color: "text-blue-500" },
    { label: "Completed", value: stats?.completedBookings ?? 0, icon: CheckCircle, color: "text-green-500" },
    { label: "Upcoming", value: stats?.upcomingBookings ?? 0, icon: Clock, color: "text-amber-500" },
    { label: "Favorites", value: stats?.favoriteSalons ?? 0, icon: Heart, color: "text-red-500" },
    { label: "AI Scans Used", value: stats?.glamScansUsed ?? 0, icon: Sparkles, color: "text-purple-500" },
    { label: "Scans Remaining", value: stats?.glamScansRemaining ?? 0, icon: Star, color: "text-yellow-500" },
  ];

  const featureCards = [
    { title: "Salon Booking", desc: "Discover & book top salons near you", href: "/salons", icon: Scissors },
    { title: "Favorites", desc: "View your saved salons", href: "/favorites", icon: Heart },
    { title: "Booking History", desc: "Past & upcoming appointments", href: "/bookings", icon: Calendar },
    { title: "Subscription", desc: `Current: ${subscription?.display_name || "Free"}`, href: "/subscription", icon: CreditCard },
    { title: "GlamAI", desc: "AI hair & skin diagnosis", href: "/glamai", icon: Sparkles },
    { title: "Profile", desc: "Manage your account", href: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8E8E8] mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F5C842] flex items-center justify-center text-[#111] text-2xl font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">
                Welcome, {profile?.full_name || "User"}!
              </h1>
              <div className="flex items-center gap-3 mt-1 text-[13px] text-[#6B7280]">
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFF9E6] text-[#B8860B] text-[12px] font-medium">
                  {subscription?.display_name || "Free"} Plan
                </span>
                {memberSince && <span>Member since {memberSince}</span>}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {/* Quick Stats */}
        <h2 className="font-display text-[#111] text-xl font-bold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-[#E8E8E8]">
              <stat.icon size={20} className={stat.color} />
              <p className="text-2xl font-bold text-[#111] mt-2">{stat.value}</p>
              <p className="text-[12px] text-[#6B7280]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <h2 className="font-display text-[#111] text-xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white rounded-xl p-5 border border-[#E8E8E8] hover:border-[#111] hover:shadow-sm transition group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <card.icon size={22} className="text-[#F5C842] mb-2" />
                  <h3 className="font-semibold text-[#111] text-[15px]">{card.title}</h3>
                  <p className="text-[13px] text-[#6B7280] mt-1">{card.desc}</p>
                </div>
                <ChevronRight size={18} className="text-[#ccc] group-hover:text-[#111] transition mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
