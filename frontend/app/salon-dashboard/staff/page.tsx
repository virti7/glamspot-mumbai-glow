"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { supabaseClient } from "@/lib/auth";
import { getAccessToken } from "@/lib/auth";
import { DashboardHeader } from "@/components/DashboardHeader";
import {
  Plus, Edit, Trash2, X, Upload, Loader2, User, Phone, Mail,
  Star, Calendar, Clock, Briefcase, ChevronDown, Check, Image as ImageIcon,
} from "lucide-react";

interface StaffMember {
  id: string;
  salon_id: string;
  name: string;
  role: string | null;
  experience: number | null;
  photo: string | null;
  avatar_url: string | null;
  specialization: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  working_days: string | null;
  working_hours: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLES = [
  "Senior Hair Stylist",
  "Hair Stylist",
  "Senior Barber",
  "Barber",
  "Nail Artist",
  "Makeup Artist",
  "Skin Specialist",
  "Spa Therapist",
  "Colorist",
  "Manager",
  "Receptionist",
  "Other",
];

const WORKING_DAYS_OPTIONS = [
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
];

const emptyForm = {
  name: "",
  role: "Hair Stylist",
  specialization: "",
  experience: 0,
  phone: "",
  email: "",
  bio: "",
  working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  working_hours: "10:00 AM - 8:00 PM",
};

export default function SalonStaffPage() {
  const { loading: authLoading } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<{ open: boolean; edit?: StaffMember }>({ open: false });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStaff = () => {
    setLoading(true);
    api
      .get<StaffMember[]>("/salon-management/staff")
      .then(setStaff)
      .catch(() => setError("Failed to load staff"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) fetchStaff();
  }, [authLoading]);

  const openAdd = () => {
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setModal({ open: true });
  };

  const openEdit = (m: StaffMember) => {
    setForm({
      name: m.name,
      role: m.role || "Hair Stylist",
      specialization: m.specialization || "",
      experience: m.experience || 0,
      phone: m.phone || "",
      email: m.email || "",
      bio: m.bio || "",
      working_days: m.working_days ? m.working_days.split(",") : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      working_hours: m.working_hours || "10:00 AM - 8:00 PM",
    });
    setPhotoFile(null);
    setPhotoPreview(m.photo || m.avatar_url || null);
    setModal({ open: true, edit: m });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (staffId: string): Promise<string | null> => {
    if (!photoFile) return photoPreview;
    setUploadingPhoto(true);
    try {
      const token = getAccessToken();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(photoFile);
      });

      const ext = photoFile.name.split(".").pop() || "jpg";
      const fileName = `staff-${staffId}/${Date.now()}.${ext}`;
      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) throw new Error("Invalid image");

      const buffer = Buffer.from(matches[2], "base64");
      const client = supabaseClient!;
      const { error: uploadErr } = await client.storage
        .from("profile-images")
        .upload(fileName, buffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = client.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch {
      setError("Failed to upload photo");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleWorkingDay = (day: string) => {
    setForm((prev) => {
      const days = prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day];
      return { ...prev, working_days: days };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      let photoUrl = photoPreview;

      const body: Record<string, any> = {
        name: form.name,
        role: form.role,
        specialization: form.specialization || null,
        experience: form.experience || null,
        phone: form.phone || null,
        email: form.email || null,
        bio: form.bio || null,
        working_days: form.working_days.join(","),
        working_hours: form.working_hours || null,
      };

      if (modal.edit) {
        const updated = await api.put<StaffMember>(`/salon-management/staff/${modal.edit.id}`, body);
        if (photoFile) {
          const url = await uploadPhoto(updated.id);
          if (url) {
            await api.put(`/salon-management/staff/${updated.id}`, { photo: url });
          }
        }
      } else {
        const created = await api.post<StaffMember>("/salon-management/staff", body);
        if (photoFile) {
          const url = await uploadPhoto(created.id);
          if (url) {
            await api.put(`/salon-management/staff/${created.id}`, { photo: url });
          }
        }
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

  const handleToggleActive = async (m: StaffMember) => {
    setTogglingId(m.id);
    try {
      await api.put(`/salon-management/staff/${m.id}`, { is_active: !m.is_active });
      fetchStaff();
    } catch {
      setError("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const activeCount = staff.filter((s) => s.is_active).length;
  const inactiveCount = staff.filter((s) => !s.is_active).length;

  return (
    <div>
      <DashboardHeader />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[#111827] text-2xl md:text-3xl font-bold">Staff</h1>
          <p className="text-[#6B7280] text-sm mt-1">Manage your team members</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25"
        >
          <Plus size={14} /> Add Staff
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {!loading && staff.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Total Staff</div>
            <p className="text-2xl font-bold text-[#111827]">{staff.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Active</div>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-4">
            <div className="text-[11px] font-semibold text-[#6B7280] uppercase mb-1">Inactive</div>
            <p className="text-2xl font-bold text-gray-400">{inactiveCount}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#9CA3AF]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading staff...
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-12 text-center">
          <User size={40} className="mx-auto text-[#D1D5DB] mb-3" />
          <p className="text-[#111827] font-semibold text-[15px]">No staff members yet</p>
          <p className="text-[#6B7280] text-[13px] mt-1">Add your first team member to get started</p>
          <button onClick={openAdd} className="mt-4 px-5 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all">
            <Plus size={14} className="inline mr-1" /> Add Staff
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#EC4899]/20 to-[#DB2777]/20 flex items-center justify-center overflow-hidden">
                    {m.photo || m.avatar_url ? (
                      <img src={m.photo || m.avatar_url!} alt={m.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-xl font-bold text-[#EC4899]">{m.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111827] text-sm">{m.name}</h3>
                    <p className="text-[12px] text-[#6B7280]">{m.role || "Staff"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(m)}
                  disabled={togglingId === m.id}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                    m.is_active
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {togglingId === m.id ? "..." : m.is_active ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {m.specialization && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Star size={12} className="text-[#EC4899]" />
                    {m.specialization}
                  </div>
                )}
                {m.experience != null && m.experience > 0 && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Briefcase size={12} className="text-[#9CA3AF]" />
                    {m.experience} years experience
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Phone size={12} className="text-[#9CA3AF]" />
                    {m.phone}
                  </div>
                )}
                {m.email && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Mail size={12} className="text-[#9CA3AF]" />
                    {m.email}
                  </div>
                )}
                {m.working_days && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Calendar size={12} className="text-[#9CA3AF]" />
                    {m.working_days}
                  </div>
                )}
                {m.working_hours && (
                  <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                    <Clock size={12} className="text-[#9CA3AF]" />
                    {m.working_hours}
                  </div>
                )}
              </div>

              {m.bio && (
                <p className="text-[12px] text-[#9CA3AF] mb-4 line-clamp-2">{m.bio}</p>
              )}

              <div className="flex gap-2 pt-3 border-t border-[#E5E7EB]/60">
                <button
                  onClick={() => openEdit(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB]/60 text-[12px] font-medium text-[#6B7280] hover:border-[#EC4899]/30 hover:text-[#EC4899] hover:bg-[#FAFAFB] transition-all"
                >
                  <Edit size={12} /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB]/60 text-[12px] font-medium text-[#6B7280] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal({ open: false })}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[#111827] text-lg font-bold">
                {modal.edit ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <button onClick={() => setModal({ open: false })} className="p-1 rounded-lg hover:bg-gray-100 text-[#9CA3AF]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EC4899]/20 to-[#DB2777]/20 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-[#E5E7EB] hover:border-[#EC4899] transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <ImageIcon size={24} className="text-[#D1D5DB]" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[13px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors"
                    >
                      {photoPreview ? "Change Photo" : "Upload Photo"}
                    </button>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">JPG, PNG or WebP. Max 5MB.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Experience (years)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) || 0 })}
                    className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Specialization</label>
                <input
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  placeholder="e.g. Hair Coloring, Balayage, Bridal Makeup"
                  className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Phone number"
                    className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email address"
                    className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Bio / Description</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Short bio about the staff member..."
                  rows={3}
                  className="w-full rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] py-2.5 resize-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {WORKING_DAYS_OPTIONS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWorkingDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                        form.working_days.includes(day)
                          ? "bg-[#EC4899] text-white border-[#EC4899]"
                          : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#EC4899]/30"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#6B7280] uppercase mb-1.5">Working Hours</label>
                <input
                  value={form.working_hours}
                  onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
                  placeholder="e.g. 10:00 AM - 8:00 PM"
                  className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal({ open: false })}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {(saving || uploadingPhoto) && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving..." : modal.edit ? "Update" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-[#111827] text-lg font-bold mb-2">Delete Staff</h3>
            <p className="text-[14px] text-[#6B7280] mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
