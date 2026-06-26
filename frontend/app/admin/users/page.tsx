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

const roleStyles: Record<string, { bg: string; color: string }> = {
  customer: { bg: "bg-blue-100", color: "text-blue-800" },
  salon_owner: { bg: "bg-green-100", color: "text-green-800" },
  admin: { bg: "bg-amber-100", color: "text-amber-800" },
};

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
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = users.filter((u) =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Users</h1>
          <p className="text-sm text-[#6B7280]">{users.length} registered users</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          type="text" placeholder="Search by name or email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60">
          <Users size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No users found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]/60 bg-[#FAFAFB]">
                  {["User", "Contact", "Role", "Joined"].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const rs = roleStyles[u.role] || roleStyles.customer;
                  return (
                    <tr key={u.id} className="border-b border-[#E5E7EB]/30 hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0">
                            {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="text-[13px] font-semibold text-[#111827]">{u.full_name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
                          <Mail size={12} /> {u.email || "—"}
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] mt-0.5">
                            <Phone size={11} /> {u.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${rs.bg} ${rs.color} capitalize`}>
                            {u.role.replace("_", " ")}
                          </span>
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            disabled={changingRole === u.id}
                            className={`px-2 py-1 rounded-xl border border-[#E5E7EB] text-[11px] outline-none ${changingRole === u.id ? "opacity-50" : ""}`}
                          >
                            {["customer", "salon_owner", "admin"].map((r) => (
                              <option key={r} value={r}>{r.replace("_", " ")}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[13px] text-[#6B7280]">
                          <Calendar size={12} />
                          {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
