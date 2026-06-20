"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { userService, type FavoriteSalon } from "@/services/user.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Heart, Star, MapPin, Trash2, ChevronRight } from "lucide-react";

export default function FavoritesPage() {
  const { loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteSalon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      userService.getFavorites()
        .then(setFavorites)
        .catch(() => setError("Failed to load favorites"))
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  const handleRemove = async (salonId: string) => {
    try {
      await userService.removeFavorite(salonId);
      setFavorites(prev => prev.filter(f => f.salon_id !== salonId));
    } catch {
      setError("Failed to remove favorite");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6]">
        <DashboardHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-[#999]">Loading favorites...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">Favorite Salons</h1>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            <Heart size={48} className="mx-auto text-[#ccc] mb-4" />
            <h3 className="font-display text-[#111] text-xl font-bold mb-2">No Favorites Yet</h3>
            <p className="text-[#6B7280] text-[14px] mb-6">Save your favorite salons for quick access.</p>
            <Link
              href="/salons"
              className="inline-flex items-center gap-2 bg-[#111] text-white rounded-full px-6 py-3 text-[14px] font-semibold hover:bg-[#333] transition"
            >
              Discover Salons <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((fav) => (
              <div key={fav.id} className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden group">
                <div className="h-32 bg-[#F8F8F8] relative">
                  {fav.salon?.cover_image ? (
                    <img src={fav.salon.cover_image} alt={fav.salon.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ccc]">
                      <Heart size={32} />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(fav.salon_id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-red-500 hover:bg-white transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#111] text-[15px]">{fav.salon?.name}</h3>
                  <p className="text-[13px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {fav.salon?.locality}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-[13px] text-[#F5C842]">
                      <Star size={14} fill="#F5C842" /> {fav.salon?.rating}
                    </span>
                    <span className="text-[13px] text-[#111] font-medium">
                      ₹{fav.salon?.price_min} – ₹{fav.salon?.price_max}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
