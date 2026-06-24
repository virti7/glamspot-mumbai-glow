"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Store, Shield, Loader2, CheckCircle, XCircle, Search } from "lucide-react";

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
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string } | null>(null);
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
      setUsers(usersData);
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
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const salonOwners = users.filter((u) => u.role === "salon_owner" || u.role === "admin");

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Store size={24} className="text-[#22C55E]" />
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Salons</h1>
        <span className="ml-2 text-[13px] text-[#6B7280]">{salons.length} total</span>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" placeholder="Search salons..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[14px]">No salons found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Salon</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Location</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Owner</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Status</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((salon) => (
                  <tr key={salon.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <span className="font-semibold text-[#111] text-[14px]">{salon.name}</span>
                      <p className="text-[12px] text-gray-400">{salon.email || salon.phone}</p>
                    </td>
                    <td className="p-4 text-[13px] text-[#6B7280]">{salon.locality}, {salon.city}</td>
                    <td className="p-4 text-[13px] text-[#6B7280]">
                      {salon.owner ? (
                        <div>
                          <span className="text-[#111]">{salon.owner.full_name}</span>
                          <p className="text-[12px]">{salon.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-amber-600">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 text-[12px] font-medium ${salon.is_active ? "text-green-600" : "text-red-500"}`}>
                        {salon.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {salon.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(salon.id, salon.is_active)}
                          disabled={toggling === salon.id}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                            salon.is_active
                              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                          } disabled:opacity-50`}
                        >
                          {toggling === salon.id ? "..." : salon.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => { setAssignTarget({ id: salon.id, name: salon.name }); setSelectedOwner(salon.owner_id || ""); }}
                          className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold border border-blue-200 hover:bg-blue-100 transition"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Owner Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAssignTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-[#111] text-lg font-bold mb-1">Assign Owner</h3>
            <p className="text-[14px] text-[#6B7280] mb-4">Select an owner for <strong>{assignTarget.name}</strong></p>
            {salonOwners.length === 0 ? (
              <p className="text-[13px] text-amber-600 mb-4">No salon owners available. Users must be registered first.</p>
            ) : (
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select a user...</option>
                {salonOwners.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                ))}
              </select>
            )}
            <div className="flex gap-3">
              <button onClick={() => setAssignTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition">Cancel</button>
              <button onClick={assignOwner} disabled={!selectedOwner || assigning === assignTarget.id} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {assigning === assignTarget.id ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
