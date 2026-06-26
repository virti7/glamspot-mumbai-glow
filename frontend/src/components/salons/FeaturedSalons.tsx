"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Salon } from "@/services/salon.service";
import { SalonCard } from "./SalonCard";

interface FeaturedSalonsProps {
  salons: Salon[];
  favorites: Set<string>;
  onToggleFavorite: (salonId: string) => void;
  user: unknown;
}

export default function FeaturedSalons({ salons, favorites, onToggleFavorite, user }: FeaturedSalonsProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const featured = useMemo(() => {
    return salons
      .filter((s) => s.rating >= 4.5 && s.reviews_count >= 50)
      .sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count)
      .slice(0, 6);
  }, [salons]);

  const scrollCarousel = useCallback((direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 400;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  const updateArrows = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  if (featured.length === 0) return null;

  return (
    <section id="featured" className="max-w-7xl mx-auto px-6 mt-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display text-[30px] font-bold text-[#111]">Featured Salons</h2>
          <p className="text-[13px] text-gray-400 mt-1.5">Premium verified salons with top ratings</p>
        </div>
      </div>

      <div className="relative group">
        {showLeftArrow && (
          <button
            onClick={() => scrollCarousel("left")}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-lg border border-[#E5E7EB]/60 flex items-center justify-center hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:shadow-lg"
          >
            <ChevronLeft size={20} className="text-[#111]" />
          </button>
        )}
        {showRightArrow && (
          <button
            onClick={() => scrollCarousel("right")}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white shadow-lg border border-[#E5E7EB]/60 flex items-center justify-center hover:scale-110 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:shadow-lg"
          >
            <ChevronRight size={20} className="text-[#111]" />
          </button>
        )}

        <div
          ref={carouselRef}
          onScroll={updateArrows}
          className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 scroll-smooth"
        >
          {featured.map((salon, idx) => (
            <div key={salon.id} className="flex-shrink-0 w-[380px]">
              <SalonCard
                salon={salon}
                index={idx}
                isFavorite={favorites.has(salon.id)}
                onToggleFavorite={onToggleFavorite}
                user={user}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
