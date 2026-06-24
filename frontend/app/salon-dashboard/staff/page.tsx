"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Plus, Edit, Trash2, X } from "lucide-react";

interface StaffMember {
  id: string;
  salon_id: string;
  name: string;
  role: string;
  experience: number | null;
  photo: string | null;
  specialization: string | null;
  is_active: boolean;
  created_at: string;
}

const emptyForm = { name: "", role: "Stylist", specialization: "", experience: 0 };

export default function SalonStaffPage() {
  const { loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<{ open: boolean; edit?: StaffMember }>({ open: false });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStaff = () => {
    setLoading(true);
    api.get<StaffMember[]>("/salon-management/staff")
      .then(setStaff)
      .catch(() => setError("Failed to load staff"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) fetchStaff();
  }, [authLoading]);

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true });
  };

  const openEdit = (m: StaffMember) => {
    setForm({ name: m.name, role: m.role, specialization: m.specialization || "", experience: m.experience || 0 });
    setModal({ open: true, edit: m });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { name: form.name, role: form.role, specialization: form.specialization || undefined, experience: form.experience || undefined };
      if (modal.edit) {
        await api.put(`/salon-management/staff/${modal.edit.id}`, body);
      } else {
        await api.post("/salon-management/staff", body);
      }
      setModal({ open: false });
      fetchStaff();
    } catch {
      setError("Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/salon-management/staff/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchStaff();
    } catch {
      setError("Failed to delete staff member");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Staff</h1>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EC4899] text-white text-[13px] font-semibold hover:bg-[#d63384] transition-all">
            <Plus size={14} /> Add Staff
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No staff members yet.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E8E8] bg-[#F8F8F8]">
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Name</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Role</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Specialization</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Experience</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Status</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((m) => (
                    <tr key={m.id} className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                      <td className="p-4 text-[14px] text-[#111] font-medium">{m.name}</td>
                      <td className="p-4 text-[13px] text-[#6B7280]">{m.role}</td>
                      <td className="p-4 text-[13px] text-[#6B7280]">{m.specialization || "—"}</td>
                      <td className="p-4 text-[13px] text-[#6B7280]">{m.experience ? `${m.experience} yrs` : "—"}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${m.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#111] transition">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
                            <Trash2 size={15} />
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

        {/* Add/Edit Modal */}
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal({ open: false })}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[#111] text-lg font-bold">{modal.edit ? "Edit Staff" : "Add Staff"}</h3>
                <button onClick={() => setModal({ open: false })} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30">
                    <option>Stylist</option>
                    <option>Barber</option>
                    <option>Nail Artist</option>
                    <option>Makeup Artist</option>
                    <option>Hair Stylist</option>
                    <option>Manager</option>
                    <option>Receptionist</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Specialization</label>
                  <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Hair Coloring" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Experience (years)</label>
                  <input type="number" min={0} value={form.experience} onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal({ open: false })} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-[#EC4899] text-white text-[13px] font-semibold hover:bg-[#d63384] transition disabled:opacity-50">
                  {saving ? "Saving..." : modal.edit ? "Update" : "Add Staff"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-[#111] text-lg font-bold mb-2">Delete Staff</h3>
              <p className="text-[14px] text-[#6B7280] mb-6">Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
