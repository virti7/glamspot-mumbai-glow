"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Store, Shield, Loader2, CheckCircle, XCircle, Search, MapPin, User, Mail, Phone, ExternalLink, AlertTriangle, RefreshCw, Crown, UserPlus } from "lucide-react";
import Link from "next/link";

interface Salon {
  id: string; name: string; slug: string; email: string; phone: string; locality: string; city: string;
  is_active: boolean; owner_id: string; created_at: string; owner?: { full_name: string; email: string } | null;
}

export default function AdminSalonsPage() {
  const { profile } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonOwners, setSalonOwners] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string; currentOwnerId: string } | null>(null);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salonsData, usersData] = await Promise.all([api.get<Salon[]>("/admin/salons"), api.get<{ id: string; full_name: string; email: string; role: string }[]>("/admin/users")]);
      setSalons(salonsData); setSalonOwners(usersData.filter((u) => u.role === "salon_owner" || u.role === "admin"));
    } catch { setError("Failed to load data"); } finally { setLoading(false); }
  };

  useEffect(() => { if (profile?.role === "admin") fetchData(); }, [profile]);

  const toggleStatus = async (id: string, current: boolean) => {
    setToggling(id);
    try { await api.put(`/admin/salons/${id}/status`, { is_active: !current }); setSalons((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s)); }
    catch { setError("Failed to update status"); } finally { setToggling(null); }
  };

  const assignOwner = async () => {
    if (!assignTarget || !selectedOwner) return;
    setAssigning(assignTarget.id);
    try { await api.put(`/admin/salons/${assignTarget.id}/assign-owner`, { owner_id: selectedOwner }); setAssignTarget(null); setSelectedOwner(""); fetchData(); }
    catch { setError("Failed to assign owner"); } finally { setAssigning(null); }
  };

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = salons.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase()) || s.owner?.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Salons</h1>
          <p className="text-sm text-[#6B7280]">{salons.length} total salons</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-medium text-[#374151] cursor-pointer ${loading ? "opacity-50" : ""}`}
        ><RefreshCw size={14} className={`${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2"><AlertTriangle size={15} />{error}</div>}

      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by salon name, location, or owner..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60"><Loader2 size={24} className="text-gray-300 mx-auto mb-3 animate-spin" /><p className="text-sm text-[#6B7280]">Loading salons...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60"><Store size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-sm text-[#6B7280]">No salons found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((salon) => (
            <div key={salon.id} className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden transition-all hover:shadow-lg">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center flex-shrink-0"><Store size={16} className="text-white" /></div>
                    <div className="min-w-0">
                      <Link href={`/salons/${salon.slug}`} target="_blank" className="text-sm font-semibold text-[#111827] no-underline truncate block">{salon.name}</Link>
                      <p className="text-[11px] text-[#9CA3AF] flex items-center gap-1"><MapPin size={9} />{salon.locality}, {salon.city}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${salon.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {salon.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />} {salon.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FAFAFB] mb-3">
                  {salon.owner ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-400 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{salon.owner.full_name?.charAt(0)?.toUpperCase() || "?"}</div>
                      <div className="flex-1 min-w-0"><p className="text-[12px] font-semibold text-[#111827] truncate">{salon.owner.full_name}</p><p className="text-[11px] text-[#9CA3AF]">{salon.owner.email}</p></div>
                      <Crown size={14} className="text-amber-400 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><User size={14} className="text-[#9CA3AF]" /></div>
                      <p className="text-[12px] font-medium text-amber-500">No owner assigned</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5 text-[11px] text-[#9CA3AF]">
                  <span className="flex items-center gap-0.5"><Mail size={9} />{salon.email || "—"}</span>
                  <span className="flex items-center gap-0.5"><Phone size={9} />{salon.phone || "—"}</span>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-[#E5E7EB]/60 bg-[#FAFAFB] flex items-center gap-2">
                <button onClick={() => toggleStatus(salon.id, salon.is_active)} disabled={toggling === salon.id}
                  className={`flex-1 py-1.5 rounded-xl border cursor-pointer text-[11px] font-semibold ${
                    salon.is_active ? "border-red-200 bg-white text-red-500" : "border-green-200 bg-white text-green-600"
                  } ${toggling === salon.id ? "opacity-50" : ""}`}
                >{toggling === salon.id ? "..." : salon.is_active ? "Deactivate" : "Activate"}</button>
                <button onClick={() => { setAssignTarget({ id: salon.id, name: salon.name, currentOwnerId: salon.owner_id || "" }); setSelectedOwner(salon.owner_id || ""); }}
                  className="flex-1 py-1.5 rounded-xl border border-[#E5E7EB] bg-white text-blue-500 text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1"
                ><UserPlus size={12} />{salon.owner ? "Reassign" : "Assign"}</button>
                <Link href={`/salons/${salon.slug}`} target="_blank" className="w-8 h-8 rounded-xl border border-[#E5E7EB] bg-white text-[#9CA3AF] flex items-center justify-center no-underline"><ExternalLink size={14} /></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAssignTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#111827] mb-1">Assign Owner</h3>
            <p className="text-[13px] text-[#6B7280] mb-5">Select owner for <strong>{assignTarget.name}</strong></p>
            {salonOwners.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-5 text-[12px] text-amber-800 flex items-center gap-2"><AlertTriangle size={13} />No salon owners available.</div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto mb-5">
                <button onClick={() => setSelectedOwner("")}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-left text-[13px] font-medium text-[#6B7280] transition-all ${
                    selectedOwner === "" ? "border-purple-300 bg-purple-50" : "border-[#E5E7EB]/60 bg-white"
                  }`}
                >None (Unassign)</button>
                {salonOwners.map((u) => (
                  <button key={u.id} onClick={() => setSelectedOwner(u.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-left transition-all ${
                      selectedOwner === u.id ? "border-purple-300 bg-purple-50" : "border-[#E5E7EB]/60 bg-white"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-400 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{u.full_name?.charAt(0)?.toUpperCase() || "?"}</div>
                    <div className="flex-1 min-w-0"><p className={`text-[13px] font-medium truncate ${selectedOwner === u.id ? "text-purple-700" : "text-[#111827]"}`}>{u.full_name}</p><p className="text-[11px] text-[#9CA3AF]">{u.email}</p></div>
                    {selectedOwner === u.id && <CheckCircle size={16} className="text-blue-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
              <button onClick={() => setAssignTarget(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] cursor-pointer">Cancel</button>
              <button onClick={assignOwner} disabled={assigning === assignTarget.id} className={`flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-[13px] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5 ${assigning === assignTarget.id ? "opacity-50" : ""}`}>
                {assigning === assignTarget.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {assigning === assignTarget.id ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
