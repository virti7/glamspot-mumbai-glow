"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { salonService, type Salon } from "@/services/salon.service";
import { userService } from "@/services/user.service";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import HeroSection from "@/components/salons/HeroSection";
import SalonSearch from "@/components/salons/SalonSearch";
import FeaturedSalons from "@/components/salons/FeaturedSalons";
import TopSalons from "@/components/salons/TopSalons";

const defaultFilters = {
  search: "",
  locality: "All Mumbai",
  service: "All Services",
  priceRange: "Any Price",
  ratingFilter: "Any Rating",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <div className="h-[240px] bg-gray-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-50 rounded animate-pulse w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-10 bg-gray-50 rounded-full animate-pulse w-28" />
          <div className="h-6 bg-gray-50 rounded-full animate-pulse w-20" />
        </div>
      </div>
    </div>
  );
}

export default function SalonsPage() {
  const { user } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    const fetchSalons = async () => {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string | number | undefined> = {
          limit: 50,
        };
        if (filters.locality !== "All Mumbai") params.locality = filters.locality;
        if (filters.service !== "All Services") params.service = filters.service;
        if (filters.search) params.search = filters.search;
        if (filters.ratingFilter !== "Any Rating") params.minRating = Number(filters.ratingFilter);
        if (filters.priceRange !== "Any Price") {
          switch (filters.priceRange) {
            case "Under ₹500": params.maxPrice = 500; break;
            case "₹500 - ₹1,000": params.minPrice = 500; params.maxPrice = 1000; break;
            case "₹1,000 - ₹2,000": params.minPrice = 1000; params.maxPrice = 2000; break;
            case "₹2,000+": params.minPrice = 2000; break;
          }
        }

        const result = await salonService.getAll(params);
        setSalons(result.salons);
      } catch {
        setError("Failed to load salons. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchSalons();
  }, [filters]);

  useEffect(() => {
    if (user) {
      userService
        .getFavorites()
        .then((favs) => setFavorites(new Set(favs.map((f) => f.salon_id))))
        .catch(() => {});
    }
  }, [user]);

  const handleToggleFavorite = useCallback(async (salonId: string) => {
    try {
      if (favorites.has(salonId)) {
        await userService.removeFavorite(salonId);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(salonId);
          return next;
        });
      } else {
        await userService.addFavorite(salonId);
        setFavorites((prev) => new Set(prev).add(salonId));
      }
    } catch {
      setError("Failed to update favorite");
    }
  }, [favorites]);

  const hasSalons = salons.length > 0;
  const sortedSalons = useMemo(() => {
    return [...salons].sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count);
  }, [salons]);

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <HeroSection />

      <SalonSearch filters={filters} onFilterChange={setFilters} />

      {loading ? (
        <section className="max-w-7xl mx-auto px-6 mt-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      ) : error ? (
        <section className="max-w-7xl mx-auto px-6 mt-14 text-center py-20">
          <p className="text-gray-500 text-[15px] mb-4">{error}</p>
          <button
            onClick={() => {
              setFilters(defaultFilters);
              setError("");
            }}
            className="px-6 py-3 rounded-full bg-[#EC4899] text-white text-[14px] font-semibold hover:bg-[#DB2777] transition-all"
          >
            Try Again
          </button>
        </section>
      ) : !hasSalons ? (
        <section className="max-w-7xl mx-auto px-6 mt-14 text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[48px] mb-4">🔍</p>
            <h3 className="font-display text-[24px] font-bold text-[#111] mb-2">No salons match your filters</h3>
            <p className="text-[14px] text-gray-400 mb-6">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => setFilters(defaultFilters)}
              className="px-6 py-3 rounded-full bg-[#EC4899] text-white text-[14px] font-semibold hover:bg-[#DB2777] transition-all"
            >
              Reset Filters
            </button>
          </motion.div>
        </section>
      ) : (
        <>
          <FeaturedSalons
            salons={sortedSalons}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            user={user}
          />
          <TopSalons
            salons={sortedSalons}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            user={user}
          />
        </>
      )}

      <section className="mx-6 mb-12 mt-14 max-w-7xl lg:mx-auto">
        <div
          className="rounded-[28px] overflow-hidden p-10 text-center relative"
          style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFF0F5 100%)" }}
        >
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-pink-200/30 blur-3xl" />
          <div className="absolute -bottom-12 left-1/4 w-40 h-40 rounded-full bg-rose-200/20 blur-3xl" />
          <div className="relative z-10">
            <h2 className="font-display text-[28px] font-bold text-[#111] mb-2">
              Can&apos;t find the right salon?
            </h2>
            <p className="text-[14px] text-gray-500 mb-6 max-w-md mx-auto">
              Let our AI analyze your hair and skin, then recommend the perfect salon for you.
            </p>
            <Link
              href="/glamai"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#EC4899] text-white text-[14px] font-semibold hover:bg-[#DB2777] hover:scale-105 transition-all duration-300 shadow-[0_8px_25px_rgba(236,72,153,0.3)]"
            >
              <Sparkles size={15} />
              Try GlamAI
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
