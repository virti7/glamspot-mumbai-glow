"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Store, User, Loader2, Shield, Search, Phone, Mail, Calendar, ArrowUpRight, XCircle, CheckCircle, AlertTriangle, RefreshCw, UserCheck, ExternalLink, Crown } from "lucide-react";
import Link from "next/link";

interface SalonOwner {
  id: string; name: string; slug: string; is_claimed: boolean; claimed_at: string | null; owner_id: string | null;
  owner: { id: string; full_name: string; email: string; phone: string; role: string; } | null;
}

interface Profile { id: string; full_name: string; email: string; phone: string; role: string; }

export default function SalonOwnersPage() {
  const { profile } = useAuth();
  const [salons, setSalons] = useState<SalonOwner[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [transferModal, setTransferModal] = useState<{ salon: SalonOwner } | null>(null);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ salon: SalonOwner } | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [salonData, userData] = await Promise.all([api.get<SalonOwner[]>("/admin/salon-owners"), api.get<Profile[]>("/admin/users")]);
      setSalons(salonData); setUsers(userData.filter((u) => u.role !== "admin"));
    } catch { setError("Failed to load data"); } finally { setLoading(false); }
  };

  useEffect(() => { if (profile?.role === "admin") fetchData(); }, [profile]);

  const handleTransfer = async () => {
    if (!transferModal || !selectedOwner) return;
    setTransferring(true); setError(""); setSuccess("");
    try {
      await api.post("/admin/salon-owners/transfer", { salon_id: transferModal.salon.id, new_owner_id: selectedOwner });
      setSuccess("Ownership transferred successfully"); setTransferModal(null); setSelectedOwner(""); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Failed to transfer ownership"); } finally { setTransferring(false); }
  };

  const handleRemove = async () => {
    if (!removeConfirm) return;
    setRemoving(true); setError(""); setSuccess("");
    try {
      await api.post("/admin/salon-owners/remove", { salon_id: removeConfirm.salon.id });
      setSuccess("Ownership removed. Salon is now unclaimed."); setRemoveConfirm(null); fetchData(); setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Failed to remove ownership"); } finally { setRemoving(false); }
  };

  const filtered = salons.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.owner?.full_name?.toLowerCase().includes(q) || s.owner?.email?.toLowerCase().includes(q) || s.owner?.phone?.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Salon Owners</h1>
          <p className="text-sm text-[#6B7280]">{salons.filter((s) => s.is_claimed).length} claimed salons</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] cursor-pointer ${loading ? "opacity-50" : ""}`}
        >
          <RefreshCw size={14} className={`${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {success && <div className="mb-4 p-3 px-4 rounded-xl bg-green-100 border border-green-200 text-green-800 text-[13px] font-medium flex items-center gap-2.5"><CheckCircle size={16} />{success}</div>}
      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-2.5"><AlertTriangle size={16} />{error}</div>}

      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by salon name, owner name, email, or phone..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60"><Loader2 size={24} className="text-gray-300 mx-auto mb-3 animate-spin" /><p className="text-sm text-[#6B7280]">Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60"><Store size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-sm text-[#6B7280]">No owned salons found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((salon) => (
            <div key={salon.id} className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden transition-all hover:shadow-lg">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center flex-shrink-0"><Store size={16} className="text-white" /></div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#111827] truncate">{salon.name}</h3>
                      <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                        {salon.is_claimed ? <><Crown size={10} className="text-amber-400" /> Claimed</> : "Not claimed"}
                      </p>
                    </div>
                  </div>
                  {salon.is_claimed && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800"><CheckCircle size={10} /> Owner Assigned</span>
                  )}
                </div>

                {salon.owner ? (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAFAFB] mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">{salon.owner.full_name?.charAt(0)?.toUpperCase() || "?"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] truncate">{salon.owner.full_name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <span className="flex items-center gap-0.5"><Mail size={9} />{salon.owner.email}</span>
                        <span className="flex items-center gap-0.5"><Phone size={9} />{salon.owner.phone || "—"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAFAFB] mb-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><User size={14} className="text-[#9CA3AF]" /></div>
                    <div><p className="text-[12px] font-medium text-amber-500">No owner assigned</p><p className="text-[11px] text-[#9CA3AF]">Salon is unclaimed</p></div>
                  </div>
                )}

                {salon.claimed_at && (
                  <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                    <Calendar size={9} /> Claimed {new Date(salon.claimed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-[#E5E7EB]/60 bg-[#FAFAFB] flex items-center gap-2">
                <Link href={`/salons/${salon.slug}`} target="_blank" className="w-8 h-8 rounded-xl border border-[#E5E7EB] bg-white text-[#9CA3AF] flex items-center justify-center no-underline"><ExternalLink size={14} /></Link>
                {salon.owner && (
                  <>
                    <button onClick={() => setTransferModal({ salon })} className="flex-1 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-purple-500 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"><ArrowUpRight size={12} />Transfer</button>
                    <button onClick={() => setRemoveConfirm({ salon })} className="flex-1 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-red-500 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"><XCircle size={12} />Remove</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTransferModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#111827] mb-1">Transfer Ownership</h3>
            <p className="text-[13px] text-[#6B7280] mb-5">Transfer <strong>{transferModal.salon.name}</strong> to a new owner</p>
            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-5">
              {users.map((u) => (
                <button key={u.id} onClick={() => setSelectedOwner(u.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-left transition-all ${
                    selectedOwner === u.id ? "border-purple-300 bg-purple-50" : "border-[#E5E7EB]/60 bg-white"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{u.full_name?.charAt(0)?.toUpperCase() || "?"}</div>
                  <div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-[#111827] truncate">{u.full_name}</p><p className="text-[11px] text-[#9CA3AF]">{u.email}</p></div>
                  {selectedOwner === u.id && <CheckCircle size={16} className="text-purple-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => { setTransferModal(null); setSelectedOwner(""); }} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] cursor-pointer">Cancel</button>
              <button onClick={handleTransfer} disabled={!selectedOwner || transferring} className={`flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 ${!selectedOwner || transferring ? "opacity-50" : ""}`}>
                {transferring ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                {transferring ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRemoveConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#111827] mb-1">Remove Ownership?</h3>
            <p className="text-[13px] text-[#6B7280] mb-4">This will remove <strong>{removeConfirm.salon.owner?.full_name}</strong> as owner of <strong>{removeConfirm.salon.name}</strong></p>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-5 text-[12px] text-amber-800">
              The salon will become unclaimed. The previous owner will lose access to manage this salon.
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setRemoveConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] cursor-pointer">Cancel</button>
              <button onClick={handleRemove} disabled={removing} className={`flex-1 py-2.5 rounded-xl bg-[#EF4444] text-white text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 ${removing ? "opacity-50" : ""}`}>
                {removing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                {removing ? "Removing..." : "Remove Owner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
