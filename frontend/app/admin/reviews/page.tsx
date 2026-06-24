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
    try {
      await api.delete(`/admin/reviews/${id}`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Failed to delete review");
    } finally {
      setProcessing(null);
    }
  };

  const handleHide = async (id: string, is_hidden: boolean) => {
    setProcessing(id);
    try {
      await api.put(`/admin/reviews/${id}/hide`, { is_hidden: !is_hidden });
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_hidden: !is_hidden } : r));
    } catch {
      setError("Failed to update review");
    } finally {
      setProcessing(null);
    }
  };

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-[#111] text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-[#6B7280] text-[13px]">Admin Only</p>
        </div>
      </div>
    );
  }

  const filtered = reviews.filter((r) => {
    const matchesSearch = !search ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.salon?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRating = ratingFilter === null || r.rating === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={24} className="text-[#FF4FA2]" />
          <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Reviews</h1>
          <span className="ml-2 text-[13px] text-[#6B7280]">{reviews.length} total</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[#6B7280] bg-white px-4 py-2 rounded-xl border border-gray-100">
          <Star size={14} className="text-amber-400 fill-amber-400" />
          <span className="font-semibold text-[#111]">{avgRating}</span> avg rating
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search reviews..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>
        <div className="flex gap-1">
          {[null, 5, 4, 3, 2, 1].map((r) => (
            <button
              key={r ?? "all"}
              onClick={() => setRatingFilter(r)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                ratingFilter === r
                  ? "bg-[#111] text-white border-[#111]"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-gray-300"
              }`}
            >
              {r === null ? "All" : `${r}★`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 text-[14px]">No reviews found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div key={review.id} className={`bg-white rounded-xl border p-4 md:p-5 transition-all ${review.is_hidden ? "border-gray-200 opacity-60" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          className={star <= review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}
                        />
                      ))}
                    </div>
                    <span className="text-[12px] font-semibold text-[#111]">{review.rating}.0</span>
                    {review.is_hidden && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium">Hidden</span>
                    )}
                  </div>
                  <p className="text-[14px] text-[#111] mb-2 leading-relaxed">{review.comment || "No comment"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
                    <span className="flex items-center gap-1">
                      <User size={12} /> {review.user?.full_name || "Unknown"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Store size={12} /> {review.salon?.name || "Unknown"}
                    </span>
                    <span>{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleHide(review.id, review.is_hidden)}
                    disabled={processing === review.id}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition disabled:opacity-50"
                    title={review.is_hidden ? "Show review" : "Hide review"}
                  >
                    {review.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={processing === review.id}
                    className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition disabled:opacity-50"
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
