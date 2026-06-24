"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  History, Shield, Loader2, Store, User, Search,
  Calendar, ArrowLeftRight, UserMinus, UserPlus,
  RefreshCw, Crown,
} from "lucide-react";
import Link from "next/link";

interface HistoryRecord {
  id: string;
  salon_id: string;
  old_owner_id: string | null;
  new_owner_id: string | null;
  action: "claim" | "transfer" | "remove";
  performed_by_admin_id: string;
  created_at: string;
  salon: { name: string } | null;
  old_owner: { full_name: string } | null;
  new_owner: { full_name: string } | null;
  performed_by: { full_name: string } | null;
}

const actionConfig: Record<string, { icon: any; label: string; bg: string; text: string; border: string }> = {
  claim: {
    icon: Crown, label: "Claim",
    bg: "bg-green-50", text: "text-green-700", border: "border-green-200",
  },
  transfer: {
    icon: ArrowLeftRight, label: "Transfer",
    bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200",
  },
  remove: {
    icon: UserMinus, label: "Remove",
    bg: "bg-red-50", text: "text-red-700", border: "border-red-200",
  },
};

export default function OwnershipHistoryPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchHistory = () => {
    setLoading(true);
    api.get<HistoryRecord[]>("/admin/ownership-history")
      .then(setHistory)
      .catch(() => setError("Failed to load ownership history"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (profile?.role === "admin") fetchHistory();
  }, [profile]);

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Access Denied</h2>
          <p className="text-[13px] text-gray-500">Admin Only</p>
        </div>
      </div>
    );
  }

  const filtered = history.filter((h) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.salon?.name?.toLowerCase().includes(q) ||
      h.old_owner?.full_name?.toLowerCase().includes(q) ||
      h.new_owner?.full_name?.toLowerCase().includes(q) ||
      h.action.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm">
              <History size={16} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900">Ownership History</h1>
            <span className="text-[13px] text-gray-400 font-medium ml-1">({history.length} events)</span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">Complete log of all salon ownership changes</p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium">{error}</div>
      )}

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by salon, owner, or action..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" />
          <p className="font-medium text-[14px]">Loading history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <History size={32} className="text-gray-300" />
          </div>
          <p className="font-medium text-[14px] text-gray-500">No history found</p>
          <p className="text-[12px] mt-1 text-gray-400">{search ? "Try a different search term" : "No ownership changes have been recorded yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const ac = actionConfig[record.action] || actionConfig.claim;
            const ActionIcon = ac.icon;
            return (
              <div key={record.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Store size={15} className="text-rose-500 shrink-0" />
                      <h3 className="text-[14px] font-semibold text-gray-900 truncate">
                        {record.salon?.name || "Unknown Salon"}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${ac.bg} ${ac.text} ${ac.border}`}>
                        <ActionIcon size={10} />
                        {ac.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-gray-500">
                      {record.old_owner && (
                        <span className="flex items-center gap-1.5">
                          <User size={11} className="text-red-400" />
                          <span className="text-red-600 line-through">{record.old_owner.full_name}</span>
                        </span>
                      )}
                      {record.old_owner && record.new_owner && (
                        <ArrowLeftRight size={12} className="text-gray-300" />
                      )}
                      {record.new_owner && (
                        <span className="flex items-center gap-1.5">
                          <UserPlus size={11} className="text-green-500" />
                          <span className="text-green-700">{record.new_owner.full_name}</span>
                        </span>
                      )}
                      {record.action === "remove" && record.old_owner && (
                        <span className="flex items-center gap-1.5">
                          <UserMinus size={11} className="text-red-500" />
                          <span className="text-red-600">{record.old_owner.full_name} removed</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={9} />
                        {new Date(record.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {record.performed_by && (
                        <span>by {record.performed_by.full_name}</span>
                      )}
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
