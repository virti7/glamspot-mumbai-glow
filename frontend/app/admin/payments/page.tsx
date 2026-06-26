"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { DollarSign, Loader2, Shield, Search, TrendingUp, IndianRupee, Calendar } from "lucide-react";

interface PaymentData {
  payments: { id: string; transaction_id: string; user: string; salon: string; amount: number; status: string; date: string }[];
  analytics: { dailyRevenue: number; monthlyRevenue: number; yearlyRevenue: number };
}

const statusStyles: Record<string, { bg: string; color: string }> = {
  completed: { bg: "bg-green-100", color: "text-green-800" },
  confirmed: { bg: "bg-blue-100", color: "text-blue-800" },
  pending: { bg: "bg-amber-100", color: "text-amber-800" },
  failed: { bg: "bg-red-100", color: "text-red-800" },
};

export default function AdminPaymentsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    api.get<PaymentData>("/admin/payments")
      .then(setData)
      .catch(() => setError("Failed to load payments"))
      .finally(() => setLoading(false));
  }, [profile]);

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = (data?.payments ?? []).filter((p) =>
    !search || p.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.toLowerCase().includes(search.toLowerCase()) ||
    p.salon?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Payments</h1>
          <p className="text-sm text-[#6B7280]">Revenue and transaction history</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading || !data ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
      ) : (
        <>
          {/* Revenue Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Daily Revenue", value: `₹${data.analytics.dailyRevenue.toLocaleString()}`, icon: Calendar, color: "#3B82F6", bg: "bg-blue-50" },
              { label: "Monthly Revenue", value: `₹${data.analytics.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: "#22C55E", bg: "bg-green-50" },
              { label: "Yearly Revenue", value: `₹${data.analytics.yearlyRevenue.toLocaleString()}`, icon: IndianRupee, color: "#F59E0B", bg: "bg-amber-50" },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <card.icon size={17} style={{ color: card.color }} />
                  </div>
                  <span className="text-[13px] text-[#6B7280] font-medium">{card.label}</span>
                </div>
                <p className="text-2xl font-bold text-[#111827]">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
            />
          </div>

          {/* Payments Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60">
              <DollarSign size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">No payments found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]/60 bg-[#FAFAFB]">
                      {["Transaction ID", "User", "Salon", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const ss = statusStyles[p.status] || statusStyles.pending;
                      return (
                        <tr key={p.id} className="border-b border-[#E5E7EB]/30 hover:bg-[#FAFAFB] transition-colors">
                          <td className="px-4 py-3.5"><span className="text-[12px] font-mono text-[#6B7280]">#{p.transaction_id}</span></td>
                          <td className="px-4 py-3.5"><span className="text-[13px] font-medium text-[#111827]">{p.user || "Guest"}</span></td>
                          <td className="px-4 py-3.5"><span className="text-[13px] text-[#6B7280]">{p.salon || "—"}</span></td>
                          <td className="px-4 py-3.5"><span className="text-[14px] font-semibold text-[#111827]">₹{p.amount?.toLocaleString() || 0}</span></td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${ss.bg} ${ss.color} capitalize`}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3.5"><span className="text-[12px] text-[#6B7280]">{new Date(p.date).toLocaleDateString()}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
