"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  FileCheck, CheckCircle, XCircle, Store, User, Loader2,
  Shield, ExternalLink, Search, Phone, Mail, Calendar,
  Clock, MapPin, AlertTriangle,
  RefreshCw, Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Claim {
  id: string;
  salon_id: string;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  salon_name: string;
  full_name: string;
  email: string;
  phone: string;
  business_email: string;
  business_phone: string;
  verification_message: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  salon?: { id: string; name: string; slug: string; locality: string; city: string; address: string };
}

export default function AdminClaimsPage() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<{ id: string; action: 'approved' | 'rejected' } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchClaims = useCallback(() => {
    setLoading(true);
    setError("");
    api.get<Claim[]>("/admin/claims")
      .then(setClaims)
      .catch((err) => setError("Failed to load claims: " + (err?.message || "Unknown error")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    fetchClaims();

    const channel = supabase
      .channel("admin-claims-realtime-page")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "salon_claims" }, () => { fetchClaims(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salon_claims" }, () => { fetchClaims(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchClaims]);

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing({ id, action: status });
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/claims/${id}/status`, { status });
      setSuccess(status === "approved" ? "Claim approved. Salon ownership updated." : "Claim rejected.");
      fetchClaims();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err: any) {
      setError(err?.message || `Failed to ${status} claim`);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = claims.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.salon_name || "").toLowerCase().includes(q) ||
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.business_phone || "").includes(q) ||
      (c.business_email || "").toLowerCase().includes(q)
    );
  });

  const statusCounts = {
    all: claims.length,
    pending: claims.filter((c) => c.status === "pending").length,
    approved: claims.filter((c) => c.status === "approved").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
  };

  const statusConfig: Record<string, { icon: any; label: string; bg: string; text: string; border: string }> = {
    approved: {
      icon: CheckCircle, label: "Approved",
      bg: "bg-green-50", text: "text-green-700", border: "border-green-200",
    },
    rejected: {
      icon: XCircle, label: "Rejected",
      bg: "bg-red-50", text: "text-red-700", border: "border-red-200",
    },
    pending: {
      icon: Clock, label: "Pending",
      bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200",
    },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <FileCheck size={16} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900">Claim Requests</h1>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">Review and manage salon ownership claims</p>
        </div>
        <button
          onClick={fetchClaims}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle size={15} className="text-green-600" />
          </div>
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={15} className="text-red-600" />
          </div>
          {error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(Object.entries(statusCounts) as [string, number][]).map(([key, count]) => {
          const isActive = filter === key;
          const sc = statusConfig[key as keyof typeof statusConfig];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? `${sc?.bg || "bg-gray-900"} ${sc?.text || "text-white"} border ${sc?.border || "border-transparent"} shadow-sm`
                  : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {key === "all" ? (
                <Sparkles size={13} />
              ) : sc?.icon ? (
                <sc.icon size={13} />
              ) : null}
              {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
              <span className={`${isActive ? "opacity-80" : "text-gray-400"} ml-0.5`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="relative mb-6">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, salon, phone, or email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" />
          <p className="font-medium text-[14px]">Loading claims...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <FileCheck size={32} className="text-gray-300" />
          </div>
          <p className="font-medium text-[14px] text-gray-500">No claims found</p>
          <p className="text-[12px] mt-1 text-gray-400">{search ? "Try a different search term" : "No claims have been submitted yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((claim) => {
            const isPending = claim.status === "pending";
            const sc = statusConfig[claim.status as keyof typeof statusConfig] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <div
                key={claim.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
                  isPending ? "border-amber-200 shadow-sm shadow-amber-100/50" : "border-gray-100"
                }`}
              >
                <div className={`px-4 py-3 border-b flex items-center justify-between ${
                  isPending ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100" : "bg-gray-50/50 border-gray-100"
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                      <Store size={15} className="text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={claim.salon?.slug ? `/salons/${claim.salon.slug}` : "#"}
                        target={claim.salon?.slug ? "_blank" : undefined}
                        className="text-[13px] font-semibold text-gray-900 truncate block hover:text-rose-600 transition"
                      >
                        {claim.salon_name || claim.salon?.name || "Unknown Salon"}
                      </Link>
                      {claim.salon?.locality && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          <MapPin size={9} />
                          {claim.salon.locality}, {claim.salon.city || ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ml-2 ${sc.bg} ${sc.text} ${sc.border}`}>
                    <StatusIcon size={10} />
                    {sc.label}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                      {claim.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{claim.full_name || "Unknown"}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail size={9} />
                          {claim.email || "-"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={9} />
                          {claim.phone || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-gray-400 font-medium">Business Email</p>
                      <p className="text-gray-800 font-medium truncate mt-0.5">{claim.business_email || "-"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-gray-400 font-medium">Business Phone</p>
                      <p className="text-gray-800 font-medium truncate mt-0.5">{claim.business_phone || "-"}</p>
                    </div>
                  </div>

                  {claim.verification_message && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Verification Message</p>
                      <p className="text-[12px] text-gray-700 leading-relaxed">{claim.verification_message}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {claim.approved_at && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={10} />
                        Approved {new Date(claim.approved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {claim.rejected_at && (
                      <span className="text-red-500 flex items-center gap-1">
                        <XCircle size={10} />
                        Rejected {new Date(claim.rejected_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`px-4 py-3.5 border-t ${
                  isPending ? "bg-amber-50/30 border-amber-100" : "bg-gray-50/30 border-gray-100"
                }`}>
                  {isPending ? (
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <button
                        onClick={() => handleStatus(claim.id, "approved")}
                        disabled={processing?.id === claim.id}
                        className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-[13px] font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                      >
                        {processing?.id === claim.id && processing?.action === "approved" ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        {processing?.id === claim.id && processing?.action === "approved" ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleStatus(claim.id, "rejected")}
                        disabled={processing?.id === claim.id}
                        className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                      >
                        {processing?.id === claim.id && processing?.action === "rejected" ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        {processing?.id === claim.id && processing?.action === "rejected" ? "Rejecting..." : "Reject"}
                      </button>
                      {claim.salon?.slug && (
                        <Link
                          href={`/salons/${claim.salon.slug}`}
                          target="_blank"
                          className="p-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition flex items-center justify-center shrink-0"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      {claim.salon?.slug && (
                        <Link
                          href={`/salons/${claim.salon.slug}`}
                          target="_blank"
                          className="text-[12px] text-rose-500 font-medium hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={12} />
                          View Salon
                        </Link>
                      )}
                      <span className="text-[11px] text-gray-400">
                        ID: {claim.id.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 text-[12px] text-gray-400 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        Showing {filtered.length} of {claims.length} claim{claims.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
