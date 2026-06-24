"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, MapPin, Heart, BadgeCheck } from "lucide-react";
import type { Salon } from "@/services/salon.service";

const salonImages = [
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
  "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
  "https://images.unsplash.com/photo-1633681926033-0aceb6a9a2b0?w=800&q=80",
];

interface SalonCardProps {
  salon: Salon;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (salonId: string) => void;
  user: unknown;
}

function SalonCardComponent({ salon, index, isFavorite, onToggleFavorite, user }: SalonCardProps) {
  const image = salon.cover_image || salonImages[index % salonImages.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={{ y: -8 }}
      className="group/card bg-white rounded-[24px] border border-gray-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.12)] transition-all duration-500 cursor-pointer"
    >
      <Link href={`/salons/${salon.slug || salon.id}`} className="block">
        <div className="relative h-[240px] overflow-hidden">
          <Image
            src={image}
            alt={salon.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover/card:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {salon.is_verified && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#F5C842] to-[#F59E0B] text-[#111] text-[11px] font-bold shadow-lg">
              <BadgeCheck size={12} /> Verified
            </span>
          )}

          {user && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(salon.id); }}
              className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm ${
                isFavorite
                  ? "bg-[#EC4899] text-white scale-110"
                  : "bg-white/80 text-gray-500 hover:bg-white hover:text-[#EC4899] hover:scale-110"
              }`}
            >
              <Heart size={16} fill={isFavorite ? "white" : "none"} />
            </button>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
              <Star size={13} className="text-[#F5C842]" fill="#F5C842" />
              <span className="text-[13px] font-bold text-[#111]">{salon.rating}</span>
              <span className="text-[11px] text-gray-400">({salon.reviews_count})</span>
            </div>
            {salon.price_min && (
              <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                <span className="text-[12px] font-semibold text-[#111]">
                  ₹{salon.price_min}{salon.price_max ? `–${salon.price_max}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="p-5">
        <Link href={`/salons/${salon.slug || salon.id}`}>
          <h3 className="font-bold text-[#111] text-[17px] mb-1.5 group-hover/card:text-[#EC4899] transition-colors duration-300 line-clamp-1">
            {salon.name}
          </h3>
        </Link>
        <p className="text-[12px] text-gray-400 flex items-center gap-1.5 mb-3">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{salon.address || salon.locality || salon.city}</span>
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <Link
            href={`/salons/${salon.slug || salon.id}`}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white text-[12px] font-semibold hover:shadow-[0_8px_25px_rgba(236,72,153,0.35)] transition-all duration-300"
          >
            Book Now
          </Link>
          {salon.tags && salon.tags.length > 0 && (
            <div className="flex gap-1">
              {salon.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-pink-50 text-[#EC4899] text-[10px] font-medium border border-pink-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export const SalonCard = memo(SalonCardComponent);
