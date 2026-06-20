"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { salonService, type Salon } from "@/services/salon.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DollarSign, Calendar, Users, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

export default function SalonDashboardPage() {
  const { profile } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role === "salon_owner") {
      salonService.getOwnerSalon()
        .then(setSalon)
        .catch(() => setError("No salon found for this account"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [profile]);

  const stats = [
    { label: "Total Revenue", value: "₹0", icon: DollarSign, change: "+0%", up: true },
    { label: "Monthly Revenue", value: "₹0", icon: TrendingUp, change: "+0%", up: true },
    { label: "Total Bookings", value: "0", icon: Calendar, change: "0", up: true },
    { label: "Customers", value: "0", icon: Users, change: "+0", up: true },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-[#999]">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Salon Dashboard</h1>
            <p className="text-[#6B7280] text-[14px] mt-1">{salon?.name || "Your Salon"}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <stat.icon size={20} className="text-[#9CA3AF]" />
                <span className={`flex items-center gap-0.5 text-[12px] font-medium ${stat.up ? "text-green-600" : "text-red-600"}`}>
                  {stat.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#111] mt-3">{stat.value}</p>
              <p className="text-[13px] text-[#6B7280] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Bookings", desc: "Manage appointments", href: "/salon-dashboard/bookings" },
            { label: "Customers", desc: "View customer history", href: "/salon-dashboard/customers" },
            { label: "Services", desc: "Manage your services", href: "/salon-dashboard/services" },
            { label: "Analytics", desc: "Detailed reports", href: "/salon-dashboard/analytics" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="bg-white rounded-xl p-5 border border-[#E8E8E8] hover:border-[#111] transition group"
            >
              <h3 className="font-semibold text-[#111] text-[15px]">{link.label}</h3>
              <p className="text-[13px] text-[#6B7280] mt-1">{link.desc}</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
