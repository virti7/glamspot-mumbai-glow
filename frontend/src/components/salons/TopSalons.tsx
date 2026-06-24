"use client";

import { useMemo } from "react";
import type { Salon } from "@/services/salon.service";
import { SalonCard } from "./SalonCard";

interface TopSalonsProps {
  salons: Salon[];
  favorites: Set<string>;
  onToggleFavorite: (salonId: string) => void;
  user: unknown;
}

export default function TopSalons({ salons, favorites, onToggleFavorite, user }: TopSalonsProps) {
  const topSalons = useMemo(() => {
    return [...salons]
      .sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count)
      .slice(0, 8);
  }, [salons]);

  if (topSalons.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 mt-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-[30px] font-bold text-[#111]">Top Salons Near You</h2>
          <p className="text-[13px] text-gray-400 mt-1.5">Best-rated salons across Mumbai</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {topSalons.map((salon, idx) => (
          <SalonCard
            key={salon.id}
            salon={salon}
            index={idx}
            isFavorite={favorites.has(salon.id)}
            onToggleFavorite={onToggleFavorite}
            user={user}
          />
        ))}
      </div>
    </section>
  );
}
