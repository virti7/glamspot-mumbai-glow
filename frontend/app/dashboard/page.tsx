"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService, type UserStats } from "@/services/user.service";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { QuickAccessCards } from "@/components/dashboard/QuickAccessCards";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && profile) {
      userService
        .getStats()
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, profile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFB]">
        <CustomerNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#EC4899] rounded-full animate-spin" />
            <span className="text-sm text-[#9CA3AF] font-medium">Loading your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <CustomerNavbar />

      <main className="w-full px-3 lg:px-4 xl:px-5 pt-[100px] pb-14 space-y-8">
        <WelcomeBanner />
        {stats && <StatsGrid stats={stats} />}
        <QuickAccessCards />
        <div className="mt-2">
          <UpgradeBanner />
        </div>
      </main>
    </div>
  );
}
