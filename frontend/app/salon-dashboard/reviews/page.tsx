"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Star, MessageSquare, Send, User } from "lucide-react";

interface Review {
  id: string;
  salon_id: string;
  user_id: string;
  rating: number;
  comment: string;
  owner_reply: string | null;
  created_at: string;
  user: { full_name: string; avatar_url: string | null } | null;
}

export default function SalonReviewsPage() {
  const { loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

  const fetchReviews = () => {
    setLoading(true);
    api.get<Review[]>("/salon-management/reviews")
      .then(setReviews)
      .catch(() => setError("Failed to load reviews"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading) fetchReviews();
  }, [authLoading]);

  const handleReply = async (reviewId: string) => {
    const reply = replyText[reviewId]?.trim();
    if (!reply) return;
    setSendingReply((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await api.post(`/salon-management/reviews/${reviewId}/reply`, { reply });
      setReplyText((prev) => ({ ...prev, [reviewId]: "" }));
      fetchReviews();
    } catch {
      setError("Failed to send reply");
    } finally {
      setSendingReply((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const filtered = ratingFilter > 0 ? reviews.filter((r) => r.rating === ratingFilter) : reviews;

  const ratingCounts = [0, 1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    count: r === 0 ? reviews.length : reviews.filter((rev) => rev.rating === r).length,
  }));

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">Reviews</h1>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
        )}

        {/* Rating Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {ratingCounts.map(({ rating, count }) => (
            <button
              key={rating}
              onClick={() => setRatingFilter(rating)}
              className={`px-4 py-2 rounded-full text-[12px] font-medium border transition-all ${
                ratingFilter === rating
                  ? "bg-[#EC4899] text-white border-[#EC4899]"
                  : "bg-white text-[#6B7280] border-gray-200 hover:border-[#EC4899]"
              }`}
            >
              {rating === 0 ? "All" : `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`}
              <span className="ml-1.5 text-[11px] opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No reviews yet.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl border border-[#E8E8E8] p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F8F8F8] flex items-center justify-center">
                      {review.user?.avatar_url ? (
                        <img src={review.user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <User size={18} className="text-[#9CA3AF]" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[14px] text-[#111]">{review.user?.full_name || "Anonymous"}</p>
                      <p className="text-[12px] text-[#6B7280]">{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} className={s <= review.rating ? "text-[#F5C842] fill-[#F5C842]" : "text-gray-200"} />
                    ))}
                  </div>
                </div>
                <p className="text-[14px] text-[#333] leading-relaxed">{review.comment}</p>

                {/* Owner Reply */}
                {review.owner_reply && (
                  <div className="mt-4 pl-4 border-l-2 border-[#EC4899] bg-[#FDF2F8] rounded-r-xl p-3">
                    <p className="text-[12px] font-semibold text-[#EC4899] mb-1 flex items-center gap-1">
                      <MessageSquare size={12} /> Your reply
                    </p>
                    <p className="text-[13px] text-[#6B7280]">{review.owner_reply}</p>
                  </div>
                )}

                {/* Reply Form */}
                {!review.owner_reply && (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={replyText[review.id] || ""}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="Write a reply..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30"
                    />
                    <button
                      onClick={() => handleReply(review.id)}
                      disabled={sendingReply[review.id] || !replyText[review.id]?.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EC4899] text-white text-[12px] font-semibold hover:bg-[#d63384] transition disabled:opacity-50"
                    >
                      {sendingReply[review.id] ? "..." : <Send size={13} />}
                      Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
