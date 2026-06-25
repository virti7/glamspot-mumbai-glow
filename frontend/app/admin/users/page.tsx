"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Users, Shield, Loader2, Search, Mail, Phone, Calendar } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  avatar_url: string;
  created_at: string;
  is_active: boolean;
}

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    api.get<Profile[]>("/admin/users")
      .then(setUsers)
      .catch(() => setError("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (profile?.role === "admin") fetchUsers(); }, [profile]);

  const changeRole = async (id: string, role: string) => {
    setChangingRole(id);
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
    } catch { setError("Failed to update role"); }
    finally { setChangingRole(null); }
  };

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = users.filter((u) =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    customer: "bg-blue-50 text-blue-700 border-blue-200",
    salon_owner: "bg-green-50 text-green-700 border-green-200",
    admin: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const roleOptions = ["customer", "salon_owner", "admin"];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users size={24} className="text-[#3B82F6]" />
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Users</h1>
        <span className="ml-2 text-[13px] text-[#6B7280]">{users.length} total</span>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" placeholder="Search by name or email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[14px]">No users found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">User</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Contact</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Role</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[13px] font-semibold text-gray-500">
                          {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <span className="font-semibold text-[#111] text-[14px]">{u.full_name || "Unknown"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
                        <Mail size={12} /> {u.email || "—"}
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280] mt-0.5">
                          <Phone size={12} /> {u.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${roleColors[u.role] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                          {u.role.replace("_", " ")}
                        </span>
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          disabled={changingRole === u.id}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:ring-1 focus:ring-gray-200 disabled:opacity-50"
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>{r.replace("_", " ")}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
                        <Calendar size={12} />
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
