"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Scissors, SlidersHorizontal, Star } from "lucide-react";
import { LOCALITIES, SERVICES } from "@glamspot/shared/constants";

interface SearchFilters {
  search: string;
  locality: string;
  service: string;
  priceRange: string;
  ratingFilter: string;
}

interface SalonSearchProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}

const priceOptions = [
  { label: "Any Price", value: "Any Price" },
  { label: "Under ₹500", value: "Under ₹500" },
  { label: "₹500 - ₹1,000", value: "₹500 - ₹1,000" },
  { label: "₹1,000 - ₹2,000", value: "₹1,000 - ₹2,000" },
  { label: "₹2,000+", value: "₹2,000+" },
];

const ratingOptions = [
  { label: "Any Rating", value: "Any Rating" },
  { label: "4.5+", value: "4.5" },
  { label: "4.0+", value: "4.0" },
  { label: "3.5+", value: "3.5" },
];

export default function SalonSearch({ filters, onFilterChange }: SalonSearchProps) {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <>
      <div ref={sentinelRef} className="h-1" />
      <div
        className={`transition-all duration-300 z-40 ${
          isSticky ? "fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.08)] py-3" : "relative"
        }`}
      >
        <div className={`${isSticky ? "max-w-7xl mx-auto px-6" : "max-w-6xl mx-auto px-6"}`}>
          <div
            className={`${
              isSticky
                ? "bg-transparent"
                : "bg-white rounded-[24px] shadow-[0_10px_50px_rgba(0,0,0,0.08)] border border-gray-100"
            } p-3`}
          >
            <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
              <div className="flex-1 flex items-center gap-3 px-4 py-2 lg:border-r border-gray-100 min-w-[200px]">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search salons, services..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className="w-full text-[14px] text-[#111] placeholder:text-gray-400 focus:outline-none bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 lg:border-r border-gray-100">
                <MapPin size={16} className="text-gray-400 shrink-0" />
                <select
                  value={filters.locality}
                  onChange={(e) => updateFilter("locality", e.target.value)}
                  className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer max-w-[110px]"
                >
                  {LOCALITIES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 lg:border-r border-gray-100">
                <Scissors size={16} className="text-gray-400 shrink-0" />
                <select
                  value={filters.service}
                  onChange={(e) => updateFilter("service", e.target.value)}
                  className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer max-w-[130px]"
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 lg:border-r border-gray-100">
                <SlidersHorizontal size={16} className="text-gray-400 shrink-0" />
                <select
                  value={filters.priceRange}
                  onChange={(e) => updateFilter("priceRange", e.target.value)}
                  className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer max-w-[130px]"
                >
                  {priceOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="hidden lg:flex items-center gap-2 px-4 py-2">
                <Star size={16} className="text-gray-400 shrink-0" />
                <select
                  value={filters.ratingFilter}
                  onChange={(e) => updateFilter("ratingFilter", e.target.value)}
                  className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer max-w-[110px]"
                >
                  {ratingOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isSticky && <div className="h-[72px]" />}
    </>
  );
}
