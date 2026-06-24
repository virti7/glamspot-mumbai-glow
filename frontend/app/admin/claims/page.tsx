"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { FileCheck, CheckCircle, XCircle, Store, User, Loader2, Shield, ExternalLink, Search, Phone, Mail, Calendar, Clock } from "lucide-react";
import Link from "next/link";

interface Claim {
  id: string;
  salon_id: string;
  owner_id: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  salon?: { id: string; name: string; slug: string; locality: string; city: string };
  owner?: { id: string; full_name: string; email: string; phone: string };
}

export default function AdminClaimsPage() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchClaims = () => {
    setLoading(true);
    api.get<Claim[]>("/admin/claims")
      .then(setClaims)
      .catch(() => setError("Failed to load claims"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (profile?.role === "admin") fetchClaims(); }, [profile]);

  const handleAction = async (id: string, status: string) => {
    setProcessing(id);
    setError("");
    try {
      await api.put(`/admin/claims/${id}/status`, { status });
      fetchClaims();
    } catch {
      setError("Failed to update claim");
    } finally {
      setProcessing(null);
    }
  };

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

  const filtered = claims.filter((c) => {
    const matchesStatus = filter === "all" || c.status === filter;
    const matchesSearch = !search || c.salon?.name?.toLowerCase().includes(search.toLowerCase()) || c.owner?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = claims.filter((c) => c.status === "pending").length;

  const statusBadge: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };

  const filterTabs = [
    { key: "all", label: "All", count: claims.length },
    { key: "pending", label: "Pending", count: claims.filter((c) => c.status === "pending").length },
    { key: "approved", label: "Approved", count: claims.filter((c) => c.status === "approved").length },
    { key: "rejected", label: "Rejected", count: claims.filter((c) => c.status === "rejected").length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <FileCheck size={24} className="text-[#FF4FA2]" />
          <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Salon Claims</h1>
          {pendingCount > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200 animate-pulse">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                filter === f.key
                  ? "bg-[#111] text-white border-[#111]"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">({f.count})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search by salon or owner..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileCheck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-[14px]">No {filter !== "all" ? filter : ""} claims found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <div key={claim.id} className="bg-white rounded-xl border border-gray-100 p-4 md:p-5 hover:border-gray-200 hover:shadow-sm transition-all">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Store size={16} className="text-gray-400 shrink-0" />
                    <h3 className="font-semibold text-[#111] text-[15px] truncate">{claim.salon?.name || "Unknown Salon"}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusBadge[claim.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                      {claim.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#6B7280]">
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      {claim.owner?.full_name || "Unknown"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={13} />
                      {claim.owner?.email}
                    </span>
                    {claim.owner?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={13} />
                        {claim.owner.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  {claim.notes && (
                    <p className="text-[13px] text-[#6B7280] mt-2 bg-gray-50 rounded-lg p-3 border border-gray-100">{claim.notes}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    {claim.salon?.slug && (
                      <Link
                        href={`/salons/${claim.salon.slug}`}
                        target="_blank"
                        className="flex items-center gap-1 text-[12px] text-[#FF4FA2] hover:underline font-medium"
                      >
                        View Salon <ExternalLink size={11} />
                      </Link>
                    )}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={11} />
                      Claimed {new Date(claim.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {claim.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(claim.id, "approved")}
                      disabled={processing === claim.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-50 text-green-700 text-[12px] font-semibold border border-green-200 hover:bg-green-100 transition disabled:opacity-50"
                    >
                      {processing === claim.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(claim.id, "rejected")}
                      disabled={processing === claim.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 text-red-700 text-[12px] font-semibold border border-red-200 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
