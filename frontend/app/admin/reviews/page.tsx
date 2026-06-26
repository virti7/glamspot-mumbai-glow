"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { MessageSquare, Loader2, Shield, Search, User, Store, Star, Trash2, Eye, EyeOff } from "lucide-react";

interface Review {
  id: string;
  salon_id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_hidden: boolean;
  created_at: string;
  salon?: { name: string };
  user?: { full_name: string; email: string };
}

export default function AdminReviewsPage() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const fetchReviews = () => {
    setLoading(true);
    api.get<Review[]>("/admin/reviews")
      .then(setReviews)
      .catch(() => setError("Failed to load reviews"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (profile?.role === "admin") fetchReviews(); }, [profile]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    setProcessing(id);
    try { await api.delete(`/admin/reviews/${id}`); setReviews((prev) => prev.filter((r) => r.id !== id)); }
    catch { setError("Failed to delete review"); }
    finally { setProcessing(null); }
  };

  const handleHide = async (id: string, is_hidden: boolean) => {
    setProcessing(id);
    try { await api.put(`/admin/reviews/${id}/hide`, { is_hidden: !is_hidden }); setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_hidden: !is_hidden } : r)); }
    catch { setError("Failed to update review"); }
    finally { setProcessing(null); }
  };

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  const filtered = reviews.filter((r) => {
    const matchesSearch = !search || r.comment?.toLowerCase().includes(search.toLowerCase()) || r.user?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.salon?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRating = ratingFilter === null || r.rating === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Reviews</h1>
          <p className="text-sm text-[#6B7280]">{reviews.length} total reviews</p>
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB]/60 text-[13px] text-[#6B7280]">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="font-semibold text-[#111827]">{avgRating}</span> avg rating
        </div>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input type="text" placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5E7EB] text-[13px] text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all"
          />
        </div>
        {[null, 5, 4, 3, 2, 1].map((r) => (
          <button key={r ?? "all"} onClick={() => setRatingFilter(r)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all ${
              ratingFilter === r ? "bg-[#111827] text-white" : "bg-white text-[#6B7280] border border-[#E5E7EB]"
            }`}
          >
            {r === null ? "All" : `${r}★`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]/60">
          <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No reviews found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((review) => (
            <div key={review.id} className={`bg-white rounded-2xl border border-[#E5E7EB]/60 p-4 transition-all ${review.is_hidden ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={13} className={star <= review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"} />
                      ))}
                    </div>
                    <span className="text-[12px] font-semibold text-[#111827]">{review.rating}.0</span>
                    {review.is_hidden && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-[#6B7280]">Hidden</span>
                    )}
                  </div>
                  <p className="text-sm text-[#111827] leading-relaxed mb-2.5">{review.comment || "No comment"}</p>
                  <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
                    <span className="flex items-center gap-1"><User size={12} /> {review.user?.full_name || "Unknown"}</span>
                    <span className="flex items-center gap-1"><Store size={12} /> {review.salon?.name || "Unknown"}</span>
                    <span>{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleHide(review.id, review.is_hidden)} disabled={processing === review.id}
                    className={`w-9 h-9 rounded-xl border border-[#E5E7EB] bg-white text-[#9CA3AF] cursor-pointer flex items-center justify-center transition-all ${processing === review.id ? "opacity-50" : ""}`}
                    title={review.is_hidden ? "Show review" : "Hide review"}
                  >
                    {review.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => handleDelete(review.id)} disabled={processing === review.id}
                    className={`w-9 h-9 rounded-xl border border-[#E5E7EB] bg-white text-[#9CA3AF] cursor-pointer flex items-center justify-center transition-all ${processing === review.id ? "opacity-50" : ""}`}
                    title="Delete review"
                  >
                    {processing === review.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
