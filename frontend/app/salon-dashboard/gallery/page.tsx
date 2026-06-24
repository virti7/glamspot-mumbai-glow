"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Plus, Trash2, X, Upload, Loader2, Crown } from "lucide-react";

interface GalleryImage {
  id: string;
  salon_id: string;
  image_url: string;
  category: string;
  created_at: string;
}

export default function SalonGalleryPage() {
  const { loading: authLoading } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Uncategorized");
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [coverTarget, setCoverTarget] = useState<string | null>(null);
  const [settingCover, setSettingCover] = useState(false);

  const fetchGallery = () => {
    setLoading(true);
    api.get<GalleryImage[]>("/salon-management/gallery")
      .then(setImages)
      .catch(() => setError("Failed to load gallery"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) fetchGallery();
  }, [authLoading]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await api.post("/salon-management/gallery", { imageBase64: base64, category });
        fetchGallery();
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      };
      reader.onerror = () => {
        setError("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Failed to upload image");
      setUploading(false);
    }
  };

  const handleSetCover = async (imageId: string) => {
    setCoverTarget(imageId);
    setSettingCover(true);
    setError("");
    try {
      await api.put(`/salon-management/gallery/${imageId}/cover`, {});
      fetchGallery();
    } catch {
      setError("Failed to set cover image");
    } finally {
      setCoverTarget(null);
      setSettingCover(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/salon-management/gallery/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchGallery();
    } catch {
      setError("Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">Gallery</h1>
          <div className="flex items-center gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30">
              <option>Uncategorized</option>
              <option>Interior</option>
              <option>Exterior</option>
              <option>Work</option>
              <option>Products</option>
              <option>Events</option>
            </select>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EC4899] text-white text-[13px] font-semibold hover:bg-[#d63384] transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading gallery...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Plus size={28} className="text-gray-300" />
            </div>
            <h3 className="font-display text-[#111] text-[18px] font-semibold mb-1">No images yet</h3>
            <p className="text-[#6B7280] text-[14px]">Upload your salon photos to showcase your work.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className={`group relative bg-white rounded-xl border overflow-hidden aspect-[4/3] ${img.is_primary ? "border-[#EC4899] ring-2 ring-[#EC4899]/20" : "border-gray-100"}`}>
                <img src={img.image_url} alt={img.category} className="w-full h-full object-cover" />
                {img.is_primary && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#EC4899] text-white text-[9px] font-bold flex items-center gap-1 shadow-md">
                    <Crown size={10} /> Cover
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                  {!img.is_primary && (
                    <button
                      onClick={() => handleSetCover(img.id)}
                      disabled={settingCover && coverTarget === img.id}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-white/90 text-[#EC4899] hover:bg-white transition-all disabled:opacity-50"
                      title="Set as cover"
                    >
                      <Crown size={16} />
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(img)} className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-white/90 text-red-600 hover:bg-white transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <span className="text-[11px] font-medium text-white/90">{img.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-[#111] text-lg font-bold mb-2">Delete Image</h3>
              <p className="text-[14px] text-[#6B7280] mb-6">Are you sure you want to delete this image? This action cannot be undone.</p>
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
