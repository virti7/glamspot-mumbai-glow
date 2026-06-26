"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { History, Shield, Loader2, Store, User, Search, Calendar, ArrowLeftRight, UserMinus, UserPlus, Crown } from "lucide-react";

interface HistoryRecord {
  id: string; salon_id: string; old_owner_id: string | null; new_owner_id: string | null;
  action: "claim" | "transfer" | "remove"; performed_by_admin_id: string; created_at: string;
  salon: { name: string } | null; old_owner: { full_name: string } | null;
  new_owner: { full_name: string } | null; performed_by: { full_name: string } | null;
}

const actionStyles: Record<string, { bg: string; color: string; icon: any }> = {
  claim: { bg: "bg-green-100", color: "text-green-800", icon: Crown },
  transfer: { bg: "bg-blue-100", color: "text-blue-800", icon: ArrowLeftRight },
  remove: { bg: "bg-red-100", color: "text-red-800", icon: UserMinus },
};

export default function OwnershipHistoryPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchHistory = () => { setLoading(true); api.get<HistoryRecord[]>("/admin/ownership-history").then(setHistory).catch(() => setError("Failed to load history")).finally(() => setLoading(false)); };
  useEffect(() => { if (profile?.role === "admin") fetchHistory(); }, [profile]);

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = history.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return h.salon?.name?.toLowerCase().includes(q) || h.old_owner?.full_name?.toLowerCase().includes(q) || h.new_owner?.full_name?.toLowerCase().includes(q) || h.action.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Ownership History</h1>
          <p className="text-sm text-[#6B7280]">{history.length} events recorded</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by salon, owner, or action..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60"><Loader2 size={24} className="text-gray-300 mx-auto mb-3 animate-spin" /><p className="text-sm text-[#6B7280]">Loading history...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60">
          <div className="w-16 h-16 rounded-xl bg-[#FAFAFB] flex items-center justify-center mx-auto mb-4"><History size={28} className="text-gray-300" /></div>
          <p className="text-[15px] font-semibold text-[#374151] mb-1">No history found</p>
          <p className="text-[13px] text-[#9CA3AF]">{search ? "Try a different search term" : "No ownership changes have been recorded yet"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((record) => {
            const ac = actionStyles[record.action] || actionStyles.claim;
            const ActionIcon = ac.icon;
            return (
              <div key={record.id} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Store size={14} className="text-[#EC4899] flex-shrink-0" />
                      <h3 className="text-sm font-semibold text-[#111827] truncate">{record.salon?.name || "Unknown Salon"}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${ac.bg} ${ac.color}`}><ActionIcon size={10} />{record.action.charAt(0).toUpperCase() + record.action.slice(1)}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-2 text-[12px] text-[#6B7280]">
                      {record.old_owner && <span className="flex items-center gap-1"><User size={11} className="text-red-400" /><span className="text-red-500 line-through">{record.old_owner.full_name}</span></span>}
                      {record.old_owner && record.new_owner && <ArrowLeftRight size={12} className="text-gray-300" />}
                      {record.new_owner && <span className="flex items-center gap-1"><UserPlus size={11} className="text-green-500" /><span className="text-green-700">{record.new_owner.full_name}</span></span>}
                      {record.action === "remove" && record.old_owner && <span className="flex items-center gap-1"><UserMinus size={11} className="text-red-500" /><span className="text-red-500">{record.old_owner.full_name} removed</span></span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#9CA3AF]">
                      <span className="flex items-center gap-1"><Calendar size={9} />{new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      {record.performed_by && <span>by {record.performed_by.full_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
