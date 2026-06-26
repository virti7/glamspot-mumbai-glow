"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { supabase } from "@/lib/supabase";
import {
  FileCheck, CheckCircle, XCircle, Store, User, Loader2,
  ExternalLink, Search, Phone, Mail, Calendar,
  Clock, MapPin, AlertTriangle, RefreshCw, Sparkles,
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

  const filterButtons = [
    { key: "all", label: "All", icon: Sparkles, bg: "bg-gray-100", activeBg: "#111827", activeText: "white" },
    { key: "pending", label: "Pending", icon: Clock, bg: "bg-amber-100", activeBg: "#F59E0B", activeText: "white" },
    { key: "approved", label: "Approved", icon: CheckCircle, bg: "bg-green-100", activeBg: "#22C55E", activeText: "white" },
    { key: "rejected", label: "Rejected", icon: XCircle, bg: "bg-red-100", activeBg: "#EF4444", activeText: "white" },
  ];

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; color: string; icon: any }> = {
      pending: { bg: "bg-amber-100", color: "text-amber-800", icon: Clock },
      approved: { bg: "bg-green-100", color: "text-green-800", icon: CheckCircle },
      rejected: { bg: "bg-red-100", color: "text-red-800", icon: XCircle },
    };
    const cfg = configs[status] || configs.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
        <Icon size={11} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Claim Requests</h1>
          <p className="text-sm text-[#6B7280]">Review and manage salon ownership claims</p>
        </div>
        <button
          onClick={fetchClaims}
          disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] cursor-pointer transition-all ${loading ? "opacity-50" : ""}`}
        >
          <RefreshCw size={14} className={`${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 p-3 px-4 rounded-xl bg-green-100 border border-green-200 text-green-800 text-[13px] font-medium flex items-center gap-2.5">
          <CheckCircle size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-2.5">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        {filterButtons.map((btn) => {
          const isActive = filter === btn.key;
          const count = statusCounts[btn.key as keyof typeof statusCounts];
          return (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-all ${
                isActive ? "text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]"
              }`}
              style={isActive ? { background: btn.activeBg } : {}}
            >
              <btn.icon size={14} />
              {btn.label}
              <span className={`font-semibold ${isActive ? "opacity-80" : "opacity-60"}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, salon, phone, or email..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60">
          <Loader2 size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-[#6B7280]">Loading claims...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60">
          <div className="w-16 h-16 rounded-xl bg-[#FAFAFB] flex items-center justify-center mx-auto mb-4">
            <FileCheck size={28} className="text-gray-300" />
          </div>
          <p className="text-[15px] font-semibold text-[#374151] mb-1">No claims found</p>
          <p className="text-[13px] text-[#9CA3AF]">{search ? "Try a different search term" : "No claims have been submitted yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((claim) => {
            const isPending = claim.status === "pending";
            return (
              <div
                key={claim.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  isPending ? "border-amber-300 shadow-md shadow-amber-100" : "border-[#E5E7EB]/60"
                }`}
              >
                {/* Card Header */}
                <div className={`px-4 py-3.5 border-b border-[#E5E7EB]/60 flex items-center justify-between ${
                  isPending ? "bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7]" : "bg-[#FAFAFB]"
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#E5E7EB]/60 flex items-center justify-center flex-shrink-0">
                      <Store size={15} className="text-[#EC4899]" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={claim.salon?.slug ? `/salons/${claim.salon.slug}` : "#"}
                        target={claim.salon?.slug ? "_blank" : undefined}
                        className="text-[13px] font-semibold text-[#111827] truncate block no-underline"
                      >
                        {claim.salon_name || claim.salon?.name || "Unknown Salon"}
                      </Link>
                      {claim.salon?.locality && (
                        <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                          <MapPin size={9} />{claim.salon.locality}, {claim.salon.city || ""}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(claim.status)}
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {/* Claimant Info */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0">
                      {claim.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] truncate">{claim.full_name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <span className="flex items-center gap-0.5"><Mail size={9} />{claim.email || "-"}</span>
                        <span className="flex items-center gap-0.5"><Phone size={9} />{claim.phone || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-[#FAFAFB]">
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Business Email</p>
                      <p className="text-[11px] font-medium text-[#374151] truncate mt-0.5">{claim.business_email || "-"}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[#FAFAFB]">
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Business Phone</p>
                      <p className="text-[11px] font-medium text-[#374151] truncate mt-0.5">{claim.business_phone || "-"}</p>
                    </div>
                  </div>

                  {/* Verification Message */}
                  {claim.verification_message && (
                    <div className="p-3 rounded-xl bg-[#FAFAFB] mb-3">
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Verification Message</p>
                      <p className="text-[12px] text-[#374151] leading-relaxed">{claim.verification_message}</p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                    <Calendar size={10} />
                    {new Date(claim.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>

                {/* Card Footer */}
                <div className={`px-4 py-3 border-t border-[#E5E7EB]/60 ${isPending ? "bg-[#FFFEF5]" : "bg-[#FAFAFB]"}`}>
                  {isPending ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatus(claim.id, "approved")}
                        disabled={processing?.id === claim.id}
                        className={`flex-1 py-2.5 rounded-xl bg-[#22C55E] text-white text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all ${processing?.id === claim.id ? "opacity-50" : ""}`}
                      >
                        {processing?.id === claim.id && processing?.action === "approved" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                        {processing?.id === claim.id && processing?.action === "approved" ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleStatus(claim.id, "rejected")}
                        disabled={processing?.id === claim.id}
                        className={`flex-1 py-2.5 rounded-xl bg-[#EF4444] text-white text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all ${processing?.id === claim.id ? "opacity-50" : ""}`}
                      >
                        {processing?.id === claim.id && processing?.action === "rejected" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        {processing?.id === claim.id && processing?.action === "rejected" ? "Rejecting..." : "Reject"}
                      </button>
                      {claim.salon?.slug && (
                        <Link
                          href={`/salons/${claim.salon.slug}`}
                          target="_blank"
                          className="w-[42px] flex items-center justify-center rounded-xl border border-[#E5E7EB] text-[#9CA3AF] no-underline transition-all"
                        >
                          <ExternalLink size={15} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {claim.salon?.slug && (
                        <Link href={`/salons/${claim.salon.slug}`} target="_blank" className="text-[12px] text-[#EC4899] font-medium no-underline flex items-center gap-1">
                          <ExternalLink size={12} /> View Salon
                        </Link>
                      )}
                      <span className="text-[11px] text-[#9CA3AF]">ID: {claim.id.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-[12px] text-[#9CA3AF]">
        Showing {filtered.length} of {claims.length} claim{claims.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
