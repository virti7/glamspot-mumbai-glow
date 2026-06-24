"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  Store, Shield, Loader2, CheckCircle, XCircle, Search,
  MapPin, User, Mail, Phone, ExternalLink, AlertTriangle,
  RefreshCw, Crown, UserPlus,
} from "lucide-react";
import Link from "next/link";

interface Salon {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  locality: string;
  city: string;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  owner?: { full_name: string; email: string } | null;
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
      const [salonsData, usersData] = await Promise.all([
        api.get<Salon[]>("/admin/salons"),
        api.get<{ id: string; full_name: string; email: string; role: string }[]>("/admin/users"),
      ]);
      setSalons(salonsData);
      setSalonOwners(usersData.filter((u) => u.role === "salon_owner" || u.role === "admin"));
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (profile?.role === "admin") fetchData(); }, [profile]);

  const toggleStatus = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await api.put(`/admin/salons/${id}/status`, { is_active: !current });
      setSalons((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
    } catch { setError("Failed to update status"); }
    finally { setToggling(null); }
  };

  const assignOwner = async () => {
    if (!assignTarget || !selectedOwner) return;
    setAssigning(assignTarget.id);
    try {
      await api.put(`/admin/salons/${assignTarget.id}/assign-owner`, { owner_id: selectedOwner });
      setAssignTarget(null);
      setSelectedOwner("");
      fetchData();
    } catch { setError("Failed to assign owner"); }
    finally { setAssigning(null); }
  };

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = salons.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase()) || s.owner?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-sm">
              <Store size={16} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900">Salons</h1>
            <span className="text-[13px] text-gray-400 font-medium ml-1">({salons.length} total)</span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">Manage all registered salons</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-2.5">
          <AlertTriangle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by salon name, location, or owner..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" />
          <p className="font-medium text-[14px]">Loading salons...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Store size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-[14px] text-gray-500">No salons found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((salon) => {
            const hasOwner = !!salon.owner;
            return (
              <div key={salon.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
                        <Store size={16} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/salons/${salon.slug}`}
                          target="_blank"
                          className="text-[14px] font-semibold text-gray-900 truncate block hover:text-rose-600 transition"
                        >
                          {salon.name}
                        </Link>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={9} />
                          {salon.locality}, {salon.city}
                        </p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ml-2 ${
                      salon.is_active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {salon.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {salon.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3">
                    {hasOwner ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {salon.owner!.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-gray-900 truncate">{salon.owner!.full_name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{salon.owner!.email}</p>
                        </div>
                        <Crown size={14} className="text-amber-500 shrink-0" />
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <User size={14} className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-medium text-amber-600">No owner assigned</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail size={9} />
                      {salon.email || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={9} />
                      {salon.phone || "—"}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(salon.id, salon.is_active)}
                    disabled={toggling === salon.id}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition disabled:opacity-50 ${
                      salon.is_active
                        ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                        : "bg-white text-green-600 border-green-200 hover:bg-green-50"
                    }`}
                  >
                    {toggling === salon.id ? "..." : salon.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => { setAssignTarget({ id: salon.id, name: salon.name, currentOwnerId: salon.owner_id || "" }); setSelectedOwner(salon.owner_id || ""); }}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-600 text-[11px] font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-1"
                  >
                    <UserPlus size={12} />
                    {hasOwner ? "Reassign" : "Assign"}
                  </button>
                  <Link
                    href={`/salons/${salon.slug}`}
                    target="_blank"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setAssignTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <UserPlus size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-gray-900">Assign Owner</h3>
                <p className="text-[13px] text-gray-500">Select owner for <strong>{assignTarget.name}</strong></p>
              </div>
            </div>

            {salonOwners.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[12px] mb-4 flex items-center gap-2">
                <AlertTriangle size={13} />
                No salon owners available. Users must be registered first.
              </div>
            ) : (
              <div className="space-y-1 mb-4 max-h-60 overflow-y-auto">
                <button
                  onClick={() => setSelectedOwner("")}
                  className={`w-full text-left p-3 rounded-xl border transition text-[13px] ${
                    selectedOwner === ""
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">None (Unassign)</span>
                </button>
                {salonOwners.map((u) => {
                  const isSelected = selectedOwner === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedOwner(u.id)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        isSelected
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-medium truncate ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                            {u.full_name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-blue-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setAssignTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={assignOwner}
                disabled={assigning === assignTarget.id}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {assigning === assignTarget.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {assigning === assignTarget.id ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
