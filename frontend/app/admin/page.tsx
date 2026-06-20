"use client";

import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Shield, Users, Store, CreditCard } from "lucide-react";

export default function AdminPage() {
  const { profile } = useAuth();

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <Shield size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="font-display text-[#111] text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-[#6B7280] text-[14px]">You do not have admin permissions.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={24} className="text-[#F5C842]" />
          <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: "—", icon: Users, desc: "Registered platform users" },
            { label: "Total Salons", value: "—", icon: Store, desc: "Registered salons" },
            { label: "Total Bookings", value: "—", icon: CreditCard, desc: "All time bookings" },
            { label: "Revenue", value: "—", icon: Shield, desc: "Platform revenue" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl p-5 border border-[#E8E8E8]">
              <card.icon size={20} className="text-[#9CA3AF]" />
              <p className="text-2xl font-bold text-[#111] mt-2">{card.value}</p>
              <p className="text-[13px] font-medium text-[#111] mt-1">{card.label}</p>
              <p className="text-[12px] text-[#6B7280]">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
