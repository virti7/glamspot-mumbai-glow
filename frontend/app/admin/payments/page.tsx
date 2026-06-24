"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { DollarSign, Loader2, Shield, Search, Calendar, TrendingUp, IndianRupee } from "lucide-react";

interface PaymentData {
  payments: { id: string; transaction_id: string; user: string; salon: string; amount: number; status: string; date: string }[];
  analytics: { dailyRevenue: number; monthlyRevenue: number; yearlyRevenue: number };
}

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
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-[#111] text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-[#6B7280] text-[13px]">Admin Only</p>
        </div>
      </div>
    );
  }

  const filtered = (data?.payments ?? []).filter((p) =>
    !search || p.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.toLowerCase().includes(search.toLowerCase()) ||
    p.salon?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <DollarSign size={24} className="text-[#FF4FA2]" />
        <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Payments</h1>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {loading || !data ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          {/* Revenue Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <Calendar size={16} className="text-blue-500" />
                <span className="text-[13px] text-[#6B7280] font-medium">Daily Revenue</span>
              </div>
              <p className="text-2xl font-bold text-[#111]">₹{data.analytics.dailyRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span className="text-[13px] text-[#6B7280] font-medium">Monthly Revenue</span>
              </div>
              <p className="text-2xl font-bold text-[#111]">₹{data.analytics.monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <IndianRupee size={16} className="text-amber-500" />
                <span className="text-[13px] text-[#6B7280] font-medium">Yearly Revenue</span>
              </div>
              <p className="text-2xl font-bold text-[#111]">₹{data.analytics.yearlyRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xs mb-6">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-200" />
          </div>

          {/* Payments Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-16"><DollarSign size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-400 text-[14px]">No payments found.</p></div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Transaction ID</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">User</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Salon</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Amount</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Status</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-4"><span className="text-[12px] font-mono text-[#6B7280]">#{p.transaction_id}</span></td>
                        <td className="p-4"><span className="text-[13px] font-medium text-[#111]">{p.user || "Guest"}</span></td>
                        <td className="p-4"><span className="text-[13px] text-[#6B7280]">{p.salon || "—"}</span></td>
                        <td className="p-4"><span className="text-[14px] font-semibold text-[#111]">₹{p.amount?.toLocaleString() || 0}</span></td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            p.status === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                            p.status === "confirmed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>{p.status}</span>
                        </td>
                        <td className="p-4"><span className="text-[12px] text-[#6B7280]">{new Date(p.date).toLocaleDateString()}</span></td>
                      </tr>
                    ))}
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
