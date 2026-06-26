"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { salonService, type Salon } from "@/services/salon.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Store, Search, CheckCircle, Clock, Loader2, ChevronRight, Sparkles, MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface Claim {
  id: string;
  salon_id: string;
  status: string;
  created_at: string;
  salon: { name: string; slug: string; locality: string; city: string } | null;
}

interface ClaimResult {
  message: string;
  claim: Claim;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  locality: string;
  city: string;
  address: string;
}

export default function SalonProfilePage() {
  const { profile } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", phone: "", address: "", locality: "", city: "",
    state: "", opening_time: "", closing_time: "", price_min: 0, price_max: 0,
    amenities: "", tags: "", cover_image: "", logo_image: "",
  });

  // Claim flow
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimModal, setClaimModal] = useState<SearchResult | null>(null);
  const [verificationMsg, setVerificationMsg] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await salonService.getOwnerSalon();
      setSalon(s);
      setForm({
        name: s.name || "",
        description: s.description || "",
        phone: s.phone || "",
        address: s.address || "",
        locality: s.locality || "",
        city: s.city || "",
        state: s.state || "",
        opening_time: s.opening_time || "",
        closing_time: s.closing_time || "",
        price_min: s.price_min || 0,
        price_max: s.price_max || 0,
        amenities: (s.amenities || []).join(", "),
        tags: (s.tags || []).join(", "),
        cover_image: s.cover_image || "",
        logo_image: s.logo_image || "",
      });
    } catch (err) {
      console.warn("No salon found for owner, loading claims instead:", err?.message || err);
      // Load claims
      try {
        const c = await api.get<Claim[]>("/salon-management/claims");
        setClaims(c);
      } catch (claimsErr) {
        console.warn("Failed to load claims:", claimsErr?.message || claimsErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        locality: form.locality || undefined,
        city: form.city,
        state: form.state || undefined,
        opening_time: form.opening_time || undefined,
        closing_time: form.closing_time || undefined,
        price_min: form.price_min || undefined,
        price_max: form.price_max || undefined,
        amenities: form.amenities ? form.amenities.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      };
      await api.put("/salon-management/profile", body);
      setSuccess("Salon profile updated successfully");
      loadData();
    } catch {
      setError("Failed to update salon profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get<SearchResult[]>(`/salon-management/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res);
    } catch (err) {
      console.error("Search failed:", err);
    } finally { setSearching(false); }
  };

  const handleClaim = async (salonId: string, message: string) => {
    const payload = { salonId, verification_message: message };
    setClaiming(true);
    try {
      const result = await api.post<ClaimResult>("/salon-management/claims", payload);
      setClaimSuccess("Claim request submitted successfully. Awaiting admin review.");
      setSearchQuery("");
      setSearchResults([]);
      setClaimModal(null);
      setVerificationMsg("");
      const c = await api.get<Claim[]>("/salon-management/claims");
      setClaims(c);
      setTimeout(() => setClaimSuccess(""), 5000);
    } catch (err: any) {
      let message = "Failed to submit claim";
      if (err?.message) message = err.message;
      else if (typeof err === "string") message = err;
      else if (err?.error) message = err.error;
      setError(message);
    } finally { setClaiming(false); }
  };

  if (loading) {
    return (
      <div>
        <DashboardHeader />
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="space-y-6">
            <div className="h-[300px] w-full rounded-2xl animate-pulse bg-[#F3F4F6]" />
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="h-7 w-48 animate-pulse rounded-xl bg-[#F3F4F6]" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-[#F3F4F6]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No salon — show claim UI
  if (!salon) {
    const hasPendingClaim = claims.some((c) => c.status === "pending");
    const approvedClaim = claims.find((c) => c.status === "approved");

    return (
      <div>
        <DashboardHeader />
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

          {/* ── Hero Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-pink-100/40 to-purple-50/60 p-8 sm:p-10 md:p-12"
          >
            {/* Decorative floating elements */}
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/20 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-pink-100/40 blur-2xl" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Left - Decorative Illustration */}
              <div className="hidden md:flex items-center justify-center w-44 h-44 rounded-2xl bg-white/70 backdrop-blur-sm shadow-[0_8px_32px_rgba(236,72,153,0.12)]">
                <div className="relative">
                  <Store size={60} className="text-[#EC4899]/70" />
                  <div className="absolute -top-2 -right-2">
                    <Sparkles size={18} className="text-[#EC4899]" />
                  </div>
                </div>
              </div>

              {/* Right - Content */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="font-display text-3xl sm:text-4xl md:text-[40px] font-bold text-[#111827] leading-tight">
                  Claim Your Salon
                </h1>
                <p className="mt-4 text-[15px] sm:text-[16px] text-[#6B7280] max-w-lg mx-auto md:mx-0 leading-relaxed">
                  Search your salon in our directory to claim ownership and start managing bookings, staff and customers.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Approved Banner ── */}
          <AnimatePresence>
            {approvedClaim && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50/50 border border-green-200/60 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-green-800">
                      Claim Approved for <strong>{approvedClaim.salon?.name}</strong>
                    </p>
                    <p className="text-[12px] text-green-600 mt-0.5">Please refresh the page to access your salon dashboard.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Claim Success Banner ── */}
          <AnimatePresence>
            {claimSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50/50 border border-green-200/60 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={18} className="text-green-600" />
                  </div>
                  <p className="text-[14px] font-medium text-green-800">{claimSuccess}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Existing Claims ── */}
          {claims.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-[18px] font-bold text-[#111827] mb-4">Your Claims</h2>
              <div className="space-y-3">
                {claims.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                        <Store size={18} className="text-[#9CA3AF]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#111827]">{c.salon?.name || "Unknown Salon"}</p>
                        <p className="text-[12px] text-[#6B7280]">{c.salon?.locality}{c.salon?.city ? `, ${c.salon.city}` : ''}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      c.status === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                      c.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Pending or Search ── */}
          {hasPendingClaim ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-10 sm:p-12 text-center shadow-sm"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
                <Clock size={32} className="text-amber-500" />
              </div>
              <h3 className="text-[20px] font-bold text-[#111827] mb-2">Claim Pending</h3>
              <p className="text-[14px] text-[#6B7280] max-w-sm mx-auto leading-relaxed">
                Your claim is under review. You will be notified once approved.
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6 sm:p-8 shadow-sm"
            >
              <h3 className="text-[16px] font-bold text-[#111827] mb-5">Search for your salon</h3>
              <div className="relative">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by salon name..."
                  className="w-full h-14 pl-12 pr-6 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#EC4899] focus:ring-2 focus:ring-[#EC4899]/20 transition-all"
                />
              </div>

              {/* Searching indicator */}
              {searching && (
                <div className="flex items-center gap-2 mt-4 text-[13px] text-[#6B7280]">
                  <Loader2 size={14} className="animate-spin" />
                  Searching salons...
                </div>
              )}

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 space-y-3"
                  >
                    {searchResults.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#E5E7EB]/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                      >
                        {/* Salon Image Placeholder */}
                        <div className="w-[100px] h-[80px] sm:w-[120px] sm:h-[90px] rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <Store size={28} className="text-pink-300/70" />
                        </div>

                        {/* Salon Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[15px] sm:text-[16px] font-bold text-[#111827] truncate">{s.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1 text-[12px] text-[#6B7280]">
                            <MapPin size={12} className="flex-shrink-0" />
                            <span className="truncate">{s.address || `${s.locality}, ${s.city}`}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-[#EC4899] border border-pink-100">
                              <CheckCircle size={10} />
                              Unclaimed
                            </span>
                            {s.locality && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                                {s.locality}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Claim Button */}
                        <button
                          onClick={() => setClaimModal(s)}
                          disabled={claiming}
                          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          <CheckCircle size={14} />
                          Claim
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty State */}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                    <Store size={36} className="text-[#9CA3AF]" />
                  </div>
                  <h4 className="text-[18px] font-bold text-[#111827] mb-1">No salons found</h4>
                  <p className="text-[14px] text-[#6B7280]">
                    Try searching using another salon name.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Claim Modal ── */}
          <AnimatePresence>
            {claimModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => { setClaimModal(null); setVerificationMsg(""); }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                  className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                        <Store size={22} className="text-[#EC4899]" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-bold text-[#111827]">Claim {claimModal.name}</h3>
                        <p className="text-[13px] text-[#6B7280]">{claimModal.locality}, {claimModal.city}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setClaimModal(null); setVerificationMsg(""); }}
                      className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      <X size={15} className="text-[#6B7280]" />
                    </button>
                  </div>

                  <div className="border-t border-[#E5E7EB]/60 pt-5">
                    <label className="block text-[13px] font-medium text-[#6B7280] mb-2">
                      Verification Message
                    </label>
                    <p className="text-[12px] text-[#9CA3AF] mb-3">Provide a brief verification message to help us confirm your ownership.</p>
                    <textarea
                      value={verificationMsg}
                      onChange={(e) => setVerificationMsg(e.target.value)}
                      placeholder="e.g., I am the owner of this salon and have all business documents..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E5E7EB] bg-[#FAFAFB] text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#EC4899] focus:ring-2 focus:ring-[#EC4899]/20 resize-none transition-all"
                    />
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[#E5E7EB]/60">
                    <button
                      onClick={() => { setClaimModal(null); setVerificationMsg(""); }}
                      className="px-5 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-medium text-[#6B7280] hover:bg-[#FAFAFB] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleClaim(claimModal.id, verificationMsg)}
                      disabled={claiming}
                      className="px-5 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {claiming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      {claiming ? "Submitting..." : "Submit Claim"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Has salon — show edit form
  return (
    <div>
      <DashboardHeader />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[#111827] text-2xl md:text-3xl font-bold">Salon Profile</h1>
          <p className="text-[#6B7280] text-sm mt-1">{salon.name}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px]">{success}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Salon Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] resize-none py-2.5" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">City</label>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Locality</label>
            <input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">State</label>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Opening Time</label>
            <input type="time" value={form.opening_time} onChange={(e) => setForm({ ...form, opening_time: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Closing Time</label>
            <input type="time" value={form.closing_time} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Min Price (₹)</label>
            <input type="number" min={0} value={form.price_min} onChange={(e) => setForm({ ...form, price_min: parseInt(e.target.value) || 0 })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Max Price (₹)</label>
            <input type="number" min={0} value={form.price_max} onChange={(e) => setForm({ ...form, price_max: parseInt(e.target.value) || 0 })} className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Amenities (comma-separated)</label>
            <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="WiFi, Parking, AC" className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Hair, Nails, Makeup" className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full" />
          </div>
        </div>

        <div className="pt-4 border-t border-[#E5E7EB]/60 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
