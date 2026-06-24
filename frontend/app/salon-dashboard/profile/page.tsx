"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { salonService, type Salon } from "@/services/salon.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Store, Search, CheckCircle, Clock, Loader2, ChevronRight } from "lucide-react";

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
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[60vh]"><div className="text-gray-400">Loading profile...</div></div>
      </div>
    );
  }

  // No salon — show claim UI
  if (!salon) {
    const hasPendingClaim = claims.some((c) => c.status === "pending");
    const approvedClaim = claims.find((c) => c.status === "approved");

    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <main className="max-w-3xl mx-auto px-6 py-8">
          <div className="text-center py-10">
            <Store size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="font-display text-[20px] font-bold text-[#111] mb-2">Claim Your Salon</h2>
            <p className="text-[#6B7280] text-[14px] mb-8 max-w-md mx-auto">
              Search for your salon in our directory to claim ownership.
            </p>
          </div>

          {approvedClaim && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-[13px] text-green-700 mb-6">
              Your claim for <strong>{approvedClaim.salon?.name}</strong> has been approved! Please refresh the page.
            </div>
          )}

          {claims.length > 0 && (
            <div className="mb-8 space-y-3">
              <h3 className="font-semibold text-[14px] text-[#111]">Your Claims</h3>
              {claims.map((c) => (
                <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-[#111]">{c.salon?.name || "Unknown Salon"}</p>
                    <p className="text-[12px] text-[#6B7280]">{c.salon?.locality}, {c.salon?.city}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${
                    c.status === "approved" ? "bg-green-50 text-green-700 border-green-200" :
                    c.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {claimSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium">
              {claimSuccess}
            </div>
          )}

          {hasPendingClaim ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-[#E8E8E8]">
              <Clock size={32} className="mx-auto text-amber-500 mb-3" />
              <h3 className="font-semibold text-[#111] text-[16px] mb-1">Claim Pending</h3>
              <p className="text-[13px] text-[#6B7280]">Your claim is under review. You will be notified once approved.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
              <h3 className="font-semibold text-[15px] text-[#111] mb-4">Search for your salon</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Type your salon name..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30"
                />
              </div>
              {searching && <p className="text-[12px] text-[#6B7280] mt-2">Searching...</p>}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                      <div>
                        <p className="text-[14px] font-medium text-[#111]">{s.name}</p>
                        <p className="text-[12px] text-[#6B7280]">{s.locality}, {s.city}</p>
                      </div>
                      <button
                        onClick={() => setClaimModal(s)}
                        disabled={claiming}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#EC4899] text-white text-[12px] font-semibold hover:bg-[#d63384] transition disabled:opacity-50"
                      >
                        <CheckCircle size={12} />
                        Claim
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <p className="text-[13px] text-[#6B7280] mt-3">No unclaimed salons found matching "{searchQuery}".</p>
              )}
            </div>
          )}

          {claimModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setClaimModal(null); setVerificationMsg(""); }}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-[16px] text-[#111] mb-1">Claim {claimModal.name}</h3>
                <p className="text-[13px] text-gray-500 mb-1">{claimModal.locality}, {claimModal.city}</p>
                <p className="text-[12px] text-gray-400 mb-4">Provide a brief verification message to help us confirm your ownership.</p>
                <textarea
                  value={verificationMsg}
                  onChange={(e) => setVerificationMsg(e.target.value)}
                  placeholder="e.g., I am the owner of this salon and have all business documents..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 resize-none mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setClaimModal(null); setVerificationMsg(""); }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleClaim(claimModal.id, verificationMsg)}
                    disabled={claiming}
                    className="px-4 py-2 rounded-xl bg-[#EC4899] text-white text-[12px] font-semibold hover:bg-[#d63384] transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {claiming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    {claiming ? "Submitting..." : "Submit Claim"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Has salon — show edit form
  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Salon Profile</h1>
            <p className="text-[#6B7280] text-[14px] mt-1">{salon.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px]">{success}</div>
        )}

        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Salon Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 resize-none" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Locality</label>
              <input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Opening Time</label>
              <input type="time" value={form.opening_time} onChange={(e) => setForm({ ...form, opening_time: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Closing Time</label>
              <input type="time" value={form.closing_time} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Min Price (₹)</label>
              <input type="number" min={0} value={form.price_min} onChange={(e) => setForm({ ...form, price_min: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Max Price (₹)</label>
              <input type="number" min={0} value={form.price_max} onChange={(e) => setForm({ ...form, price_max: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Amenities (comma-separated)</label>
              <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="WiFi, Parking, AC" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Hair, Nails, Makeup" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-6 py-2.5 rounded-full bg-[#EC4899] text-white text-[13px] font-semibold hover:bg-[#d63384] transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
