"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { salonService, type Salon, type SalonService } from "@/services/salon.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Clock, DollarSign, TrendingUp, Plus, Edit, Trash2, X } from "lucide-react";

const emptyForm = { name: "", description: "", category: "", duration_minutes: 60, price: 0, discounted_price: 0 };

export default function SalonServicesPage() {
  const { profile } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<SalonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<{ open: boolean; edit?: SalonService }>({ open: false });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SalonService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchServices = () => {
    if (!salon) return;
    salonService.getServices(salon.id)
      .then(setServices)
      .catch(() => setError("Failed to load services"));
  };

  useEffect(() => {
    if (profile?.role === "salon_owner") {
      salonService.getOwnerSalon()
        .then((s) => {
          setSalon(s);
          return salonService.getServices(s.id);
        })
        .then(setServices)
        .catch(() => setError("No salon found"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [profile]);

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true });
  };

  const openEdit = (svc: SalonService) => {
    setForm({ name: svc.name, description: svc.description || "", category: svc.category || "", duration_minutes: svc.duration_minutes || 60, price: svc.price, discounted_price: svc.discounted_price || 0 });
    setModal({ open: true, edit: svc });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const body = { name: form.name, description: form.description || undefined, category: form.category || undefined, duration_minutes: form.duration_minutes, price: form.price, discounted_price: form.discounted_price || undefined };
      if (modal.edit) {
        await api.put(`/salon-management/services/${modal.edit.id}`, body);
      } else {
        await api.post("/salon-management/services", body);
      }
      setModal({ open: false });
      fetchServices();
    } catch {
      setError("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/salon-management/services/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchServices();
    } catch {
      setError("Failed to delete service");
    } finally {
      setDeleting(false);
    }
  };

  const popularServices = services.filter(s => s.is_popular);
  const regularServices = services.filter(s => !s.is_popular);

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Services</h1>
            <p className="text-[#6B7280] text-[14px] mt-1">{salon?.name}</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EC4899] text-white text-[13px] font-semibold hover:bg-[#d63384] transition-all">
            <Plus size={14} /> Add Service
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No services listed yet.</div>
        ) : (
          <>
            {popularServices.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-[#111] text-[15px] mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#F5C842]" /> Popular Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popularServices.map((svc) => (
                    <div key={svc.id} className="bg-white rounded-xl p-5 border-2 border-[#F5C842] relative group">
                      <button onClick={() => openEdit(svc)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-400 hover:text-[#111] transition-all shadow-sm">
                        <Edit size={14} />
                      </button>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF9E6] text-[#B8860B] text-[10px] font-bold">POPULAR</span>
                      <h4 className="font-semibold text-[#111] text-[15px] mt-2">{svc.name}</h4>
                      {svc.description && <p className="text-[13px] text-[#6B7280] mt-1">{svc.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                          <Clock size={13} /> {svc.duration_minutes || 60} min
                        </span>
                        <span className="flex items-center gap-1 text-[15px] font-bold text-[#111]">
                          <DollarSign size={14} /> {svc.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-semibold text-[#111] text-[15px] mb-3">All Services</h3>
            <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8E8E8] bg-[#F8F8F8]">
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Service</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Category</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Duration</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Price</th>
                      <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularServices.map((svc) => (
                      <tr key={svc.id} className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                        <td className="p-4">
                          <span className="text-[14px] text-[#111]">{svc.name}</span>
                          {svc.description && <p className="text-[12px] text-[#6B7280]">{svc.description}</p>}
                        </td>
                        <td className="p-4 text-[13px] text-[#6B7280]">{svc.category || "—"}</td>
                        <td className="p-4 text-[13px] text-[#6B7280]">{svc.duration_minutes || 60} min</td>
                        <td className="p-4 text-[14px] font-medium text-[#111]">
                          ₹{svc.price}
                          {svc.discounted_price && (
                            <span className="ml-2 text-[12px] text-green-600 line-through">₹{svc.discounted_price}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(svc)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#111] transition">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => setDeleteTarget(svc)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition">
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
          </>
        )}

        {/* Add/Edit Modal */}
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal({ open: false })}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[#111] text-lg font-bold">{modal.edit ? "Edit Service" : "Add Service"}</h3>
                <button onClick={() => setModal({ open: false })} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Service Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Haircut" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30">
                      <option value="">Select</option>
                      <option>Hair</option>
                      <option>Nails</option>
                      <option>Makeup</option>
                      <option>Facial</option>
                      <option>Massage</option>
                      <option>Skin</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Duration (min)</label>
                    <input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Price (₹)</label>
                    <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Discounted Price</label>
                    <input type="number" min={0} value={form.discounted_price} onChange={(e) => setForm({ ...form, discounted_price: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal({ open: false })} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-[#6B7280] hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.price} className="flex-1 py-2.5 rounded-xl bg-[#EC4899] text-white text-[13px] font-semibold hover:bg-[#d63384] transition disabled:opacity-50">
                  {saving ? "Saving..." : modal.edit ? "Update" : "Add Service"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-[#111] text-lg font-bold mb-2">Delete Service</h3>
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
