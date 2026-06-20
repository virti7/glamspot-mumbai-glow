"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { salonService, type Salon } from "@/services/salon.service";
import { userService } from "@/services/user.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Star, MapPin, Search, Heart, SlidersHorizontal } from "lucide-react";
import { LOCALITIES, SERVICES } from "@glamspot/shared/constants";

export default function SalonsPage() {
  const { user } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("All Mumbai");
  const [service, setService] = useState("All Services");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSalons = async () => {
      setLoading(true);
      try {
        const result = await salonService.getAll({
          locality: locality !== "All Mumbai" ? locality : undefined,
          service: service !== "All Services" ? service : undefined,
          search: search || undefined,
        });
        setSalons(result.salons);
      } catch {
        setError("Failed to load salons");
      } finally {
        setLoading(false);
      }
    };
    fetchSalons();
  }, [locality, service, search]);

  useEffect(() => {
    if (user) {
      userService.getFavorites()
        .then(favs => setFavorites(new Set(favs.map(f => f.salon_id))))
        .catch(() => {});
    }
  }, [user]);

  const handleToggleFavorite = async (salonId: string) => {
    try {
      if (favorites.has(salonId)) {
        await userService.removeFavorite(salonId);
        setFavorites(prev => { const next = new Set(prev); next.delete(salonId); return next; });
      } else {
        await userService.addFavorite(salonId);
        setFavorites(prev => new Set(prev).add(salonId));
      }
    } catch {
      setError("Failed to update favorite");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">Discover Salons</h1>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search salons, services, or localities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111] transition-all"
              />
            </div>
            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="h-[44px] px-4 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#111]"
            >
              {LOCALITIES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="h-[44px] px-4 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#333] focus:outline-none focus:border-[#111]"
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading salons...</div>
        ) : salons.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No salons found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => (
              <div key={salon.id} className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden group">
                <div className="h-44 bg-[#F8F8F8] relative">
                  {salon.cover_image ? (
                    <img src={salon.cover_image} alt={salon.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ccc] text-[13px]">
                      No Image
                    </div>
                  )}
                  {user && (
                    <button
                      onClick={() => handleToggleFavorite(salon.id)}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition ${
                        favorites.has(salon.id) ? "bg-[#E85D75] text-white" : "bg-white/80 text-[#6B7280] hover:bg-white"
                      }`}
                    >
                      <Heart size={15} fill={favorites.has(salon.id) ? "white" : "none"} />
                    </button>
                  )}
                  {salon.is_verified && (
                    <span className="absolute top-3 left-3 bg-[#F5C842] text-[#111] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      VERIFIED
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-[#111] text-[16px]">{salon.name}</h3>
                    <span className="flex items-center gap-1 text-[13px] text-[#F5C842]">
                      <Star size={13} fill="#F5C842" /> {salon.rating}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#6B7280] flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {salon.locality}, {salon.city}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[13px] text-[#111] font-medium">
                      ₹{salon.price_min} – ₹{salon.price_max}
                    </span>
                    <span className="text-[12px] text-[#6B7280]">({salon.reviews_count} reviews)</span>
                  </div>
                  {salon.tags && salon.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {salon.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-[#F8F8F8] text-[#6B7280] text-[11px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
