"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { userService, type FavoriteSalon } from "@/services/user.service";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
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
      <div className="min-h-screen bg-[#FAFAFB]">
        <CustomerNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#EC4899] rounded-full animate-spin" />
            <span className="text-sm text-[#9CA3AF] font-medium">Loading favorites...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <CustomerNavbar />
      <main className="max-w-4xl mx-auto px-6 pt-[112px] pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-6">Favorite Salons</h1>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={64} className="w-16 h-16 mx-auto text-[#D1D5DB] mb-4" />
            <h3 className="text-lg font-semibold text-[#111827] mb-2">No Favorites Yet</h3>
            <p className="text-sm text-[#6B7280] mb-6">Save your favorite salons for quick access.</p>
            <Link
              href="/salons"
              className="inline-flex items-center gap-2 bg-[#EC4899] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25"
            >
              Discover Salons <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((fav) => (
              <div key={fav.id} className="bg-white rounded-2xl border border-[#E5E7EB]/60 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                <div className="h-32 bg-[#FAFAFB] relative">
                  {fav.salon?.cover_image ? (
                    <img src={fav.salon.cover_image} alt={fav.salon.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#D1D5DB]">
                      <Heart size={32} />
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(fav.salon_id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-[#EF4444] hover:bg-white transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-[#111827] text-[15px]">{fav.salon?.name}</h3>
                  <p className="text-sm text-[#6B7280] flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {fav.salon?.locality}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="flex items-center gap-1 text-sm text-[#F5C842]">
                      <Star size={14} fill="#F5C842" /> {fav.salon?.rating}
                    </span>
                    <span className="text-sm text-[#111827] font-medium">
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
