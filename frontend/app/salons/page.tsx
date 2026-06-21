"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { salonService, type Salon } from "@/services/salon.service";
import { userService } from "@/services/user.service";
import { LOCALITIES, SERVICES } from "@glamspot/shared/constants";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, MapPin, Search, Heart, SlidersHorizontal, ChevronRight,
  ChevronLeft, ArrowRight, Sparkles, Scissors, Droplets, Sun,
  Shield, Heart as HeartIcon, Paintbrush, Palette, Camera,
  BadgeCheck, TrendingUp, Clock, Users, Zap,
} from "lucide-react";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80&auto=format&fit=crop",
];

const TRENDING_SERVICES = [
  { title: "Hair Spa", desc: "Deep conditioning & repair treatments", price: "₹800", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80", icon: Scissors, color: "#EC4899" },
  { title: "Hair Color", desc: "Professional coloring & highlights", price: "₹1,500", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80", icon: Palette, color: "#A855F7" },
  { title: "Facial", desc: "Luxury skincare & glow facials", price: "₹1,200", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80", icon: Droplets, color: "#22C55E" },
  { title: "Bridal Makeup", desc: "Complete bridal beauty package", price: "₹8,000", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80", icon: Sparkles, color: "#F59E0B" },
  { title: "Nail Art", desc: "Creative nail designs & gel polish", price: "₹500", image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80", icon: Paintbrush, color: "#EC4899" },
  { title: "Skin Treatment", desc: "Advanced dermatological care", price: "₹2,000", image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&q=80", icon: Sun, color: "#8B5CF6" },
];

const POPULAR_LOCATIONS = [
  { name: "Bandra", count: 45, image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&q=80" },
  { name: "Andheri", count: 38, image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80" },
  { name: "Juhu", count: 32, image: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=600&q=80" },
  { name: "Powai", count: 28, image: "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=600&q=80" },
  { name: "South Mumbai", count: 52, image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80" },
  { name: "Borivali", count: 22, image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80" },
];

export default function SalonsPage() {
  const { user } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("All Mumbai");
  const [service, setService] = useState("All Services");
  const [priceRange, setPriceRange] = useState("Any Price");
  const [ratingFilter, setRatingFilter] = useState("Any Rating");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    const fetchSalons = async () => {
      setLoading(true);
      try {
        const result = await salonService.getAll({
          locality: locality !== "All Mumbai" ? locality : undefined,
          service: service !== "All Services" ? service : undefined,
          search: search || undefined,
          minRating: ratingFilter !== "Any Rating" ? Number(ratingFilter) : undefined,
          limit: 20,
        });
        setSalons(result.salons);
      } catch {
        setError("Failed to load salons");
      } finally {
        setLoading(false);
      }
    };
    fetchSalons();
  }, [locality, service, search, ratingFilter]);

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

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 380;
    carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const updateArrows = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const handleSearch = () => {
    setSearch(search);
  };

  const featuredSalons = salons.filter(s => s.is_verified).slice(0, 8);
  const topSalons = salons.slice(0, 12);

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      {/* ===== HERO SECTION ===== */}
      <section className="relative h-[420px] overflow-hidden" style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFFDFD 100%)" }}>
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-64 h-64 rounded-full bg-rose-200/20 blur-3xl" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex items-center">
          <div className="flex-1 z-20">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-[42px] lg:text-[52px] font-bold text-[#111] leading-[1.1] mb-4"
            >
              Discover <span className="text-[#EC4899]">Mumbai&apos;s</span><br />
              Best Salons <span className="text-[28px]">✨</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[15px] text-gray-500 font-medium mb-6 max-w-md leading-relaxed"
            >
              Find, compare and book premium beauty experiences near you.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <a
                href="#featured"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#EC4899] text-white text-[14px] font-semibold hover:bg-[#DB2777] hover:scale-105 transition-all duration-300 shadow-[0_8px_25px_rgba(236,72,153,0.3)]"
              >
                Explore Salons
                <ArrowRight size={15} />
              </a>
              <Link
                href="/glamai"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#111] text-[14px] font-semibold border border-gray-200 hover:border-[#EC4899] hover:text-[#EC4899] hover:scale-105 transition-all duration-300 shadow-sm"
              >
                Try GlamAI
                <Sparkles size={14} />
              </Link>
            </motion.div>
          </div>

          <div className="hidden lg:flex items-center gap-4 relative w-[45%] h-[350px]">
            {HERO_IMAGES.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 40, rotate: 0 }}
                animate={{ opacity: 1, x: 0, rotate: [-8, 4, -4, 8, 0][i] }}
                transition={{ duration: 0.6, delay: 0.1 * i }}
                className="absolute"
                style={{
                  right: [0, 120, 60, 180, 140][i],
                  top: [0, 80, 160, 40, 200][i],
                  zIndex: [5, 4, 3, 2, 1][i],
                  width: [180, 140, 160, 120, 130][i],
                  height: [220, 170, 200, 150, 160][i],
                }}
              >
                <img
                  src={img}
                  alt="Beauty salon"
                  className="w-full h-full object-cover rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border-2 border-white/50"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FLOATING SEARCH BAR ===== */}
      <div className="relative z-30 max-w-6xl mx-auto px-6 -mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-[24px] shadow-[0_10px_50px_rgba(0,0,0,0.08)] border border-gray-100 p-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-2 border-r border-gray-100">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search salons, services..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full text-[14px] text-[#111] placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-r border-gray-100">
              <MapPin size={16} className="text-gray-400" />
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer"
              >
                {LOCALITIES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-r border-gray-100">
              <Scissors size={16} className="text-gray-400" />
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer"
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-r border-gray-100">
              <SlidersHorizontal size={16} className="text-gray-400" />
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer"
              >
                <option>Any Price</option>
                <option>Under ₹500</option>
                <option>₹500 - ₹1,000</option>
                <option>₹1,000 - ₹2,000</option>
                <option>₹2,000+</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-2">
              <Star size={16} className="text-gray-400" />
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="text-[13px] text-[#333] bg-transparent focus:outline-none cursor-pointer"
              >
                <option>Any Rating</option>
                <option>4.5+</option>
                <option>4.0+</option>
                <option>3.5+</option>
              </select>
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 rounded-[18px] bg-[#EC4899] text-white text-[14px] font-semibold hover:bg-[#DB2777] transition-all shadow-md"
            >
              Search
            </button>
          </div>
        </motion.div>
      </div>

      {/* ===== FEATURED SALONS ===== */}
      <section id="featured" className="max-w-7xl mx-auto px-6 mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-[28px] font-bold text-[#111]">Featured Salons</h2>
            <p className="text-[13px] text-gray-400 mt-1">Handpicked premium salons in Mumbai</p>
          </div>
          <Link
            href="#"
            className="flex items-center gap-1 text-[13px] text-[#EC4899] font-semibold hover:text-[#DB2777] transition"
          >
            View All <ChevronRight size={14} />
          </Link>
        </div>

        <div className="relative group">
          {showLeftArrow && (
            <button
              onClick={() => scrollCarousel("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center hover:scale-110 transition opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={18} className="text-[#111]" />
            </button>
          )}
          {showRightArrow && (
            <button
              onClick={() => scrollCarousel("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center hover:scale-110 transition opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={18} className="text-[#111]" />
            </button>
          )}

          <div
            ref={carouselRef}
            onScroll={updateArrows}
            className="flex gap-5 overflow-x-auto hide-scrollbar pb-4 scroll-smooth"
          >
            {(featuredSalons.length > 0 ? featuredSalons : [
              { id: "1", name: "Hakim's Amin Salon", locality: "Bandra West", city: "Mumbai", rating: 4.8, reviews_count: 1240, price_min: 500, price_max: 3500, cover_image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80", tags: ["Hair", "Skin", "Spa", "Makeup"], is_verified: true, slug: "hakims-amin", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "2", name: "Pepe's Luxury Salon", locality: "Andheri West", city: "Mumbai", rating: 4.7, reviews_count: 890, price_min: 1200, price_max: 5000, cover_image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80", tags: ["Hair", "Bridal", "Makeup"], is_verified: true, slug: "pepes-luxury", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "3", name: "Bounce Salon", locality: "Juhu", city: "Mumbai", rating: 4.6, reviews_count: 756, price_min: 800, price_max: 4000, cover_image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=500&q=80", tags: ["Hair", "Nails", "Skin"], is_verified: true, slug: "bounce-salon", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "4", name: "Awadh Lifestyle Salon", locality: "Powai", city: "Mumbai", rating: 4.5, reviews_count: 634, price_min: 400, price_max: 2500, cover_image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80", tags: ["Hair", "Skin", "Makeup"], is_verified: true, slug: "awadh-lifestyle", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
            ]).map((salon) => (
              <motion.div
                key={salon.id}
                whileHover={{ y: -6 }}
                className="flex-shrink-0 w-[340px] bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.1)] transition-all duration-300 group/card cursor-pointer"
              >
                <div className="relative h-[220px] overflow-hidden">
                  <img
                    src={salon.cover_image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80"}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {salon.is_verified && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5C842] text-[#111] text-[10px] font-bold shadow-md">
                      <BadgeCheck size={10} /> Featured
                    </span>
                  )}
                  {user && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(salon.id); }}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition shadow-md ${
                        favorites.has(salon.id) ? "bg-[#EC4899] text-white" : "bg-white/90 text-gray-500 hover:bg-white hover:text-[#EC4899]"
                      }`}
                    >
                      <Heart size={15} fill={favorites.has(salon.id) ? "white" : "none"} />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <Star size={12} className="text-[#F5C842]" fill="#F5C842" />
                      <span className="text-[12px] font-semibold text-[#111]">{salon.rating}</span>
                      <span className="text-[11px] text-gray-400">({salon.reviews_count})</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[#111] text-[16px] mb-1 group-hover/card:text-[#EC4899] transition-colors">{salon.name}</h3>
                  <p className="text-[12px] text-gray-400 flex items-center gap-1 mb-3">
                    <MapPin size={11} /> {salon.locality}, {salon.city}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(salon.tags || ["Hair", "Skin"]).slice(0, 4).map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-pink-50 text-[#EC4899] text-[10px] font-medium border border-pink-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-500">
                      Starting from <span className="text-[#111] font-semibold">₹{salon.price_min || 500}</span>
                    </span>
                    <button className="px-4 py-2 rounded-full bg-[#EC4899] text-white text-[12px] font-semibold hover:bg-[#DB2777] transition-all shadow-sm">
                      Book Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TOP SALONS NEAR YOU ===== */}
      <section className="max-w-7xl mx-auto px-6 mt-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-[28px] font-bold text-[#111]">Top Salons Near You</h2>
            <p className="text-[13px] text-gray-400 mt-1">Best-rated salons in your area</p>
          </div>
          <Link
            href="#"
            className="flex items-center gap-1 text-[13px] text-[#EC4899] font-semibold hover:text-[#DB2777] transition"
          >
            View All Salons <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-[20px] overflow-hidden border border-gray-100">
                <div className="h-48 bg-gray-100 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-50 rounded animate-pulse w-1/2" />
                  <div className="h-8 bg-gray-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(topSalons.length > 0 ? topSalons : [
              { id: "5", name: "Jean Claude Biguine", locality: "Bandra West", city: "Mumbai", rating: 4.9, reviews_count: 2100, price_min: 1500, price_max: 8000, cover_image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80", tags: ["Hair", "Spa", "Makeup"], is_verified: true, slug: "jc-bandra", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "6", name: "Toni & Guy", locality: "Juhu", city: "Mumbai", rating: 4.7, reviews_count: 1800, price_min: 1200, price_max: 6000, cover_image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80", tags: ["Hair", "Color"], is_verified: true, slug: "toni-guy-juhu", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "7", name: "Kaya Skin Clinic", locality: "Powai", city: "Mumbai", rating: 4.6, reviews_count: 1500, price_min: 2000, price_max: 10000, cover_image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80", tags: ["Skin", "Treatment"], is_verified: true, slug: "kaya-powai", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "8", name: "Enrich Salon", locality: "Andheri", city: "Mumbai", rating: 4.5, reviews_count: 1200, price_min: 600, price_max: 3000, cover_image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&q=80", tags: ["Hair", "Nails", "Bridal"], is_verified: true, slug: "enrich-andheri", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "9", name: "VLCC Wellness", locality: "South Mumbai", city: "Mumbai", rating: 4.4, reviews_count: 980, price_min: 1000, price_max: 5000, cover_image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80", tags: ["Skin", "Spa", "Weight Loss"], is_verified: true, slug: "vlcc-south-mumbai", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "10", name: "Naturals Salon", locality: "Borivali", city: "Mumbai", rating: 4.3, reviews_count: 760, price_min: 400, price_max: 2500, cover_image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80", tags: ["Hair", "Skin"], is_verified: false, slug: "naturals-borivali", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "11", name: "Cult Hair Studio", locality: "Juhu", city: "Mumbai", rating: 4.8, reviews_count: 540, price_min: 800, price_max: 4000, cover_image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80", tags: ["Hair", "Color", "Spa"], is_verified: true, slug: "cult-juhu", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
              { id: "12", name: "Lakme Salon", locality: "Bandra", city: "Mumbai", rating: 4.6, reviews_count: 1650, price_min: 700, price_max: 3500, cover_image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80", tags: ["Hair", "Makeup", "Nails"], is_verified: true, slug: "lakme-bandra", description: null, logo_image: null, amenities: [], opening_time: null, closing_time: null },
            ]).map((salon, idx) => (
              <motion.div
                key={salon.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.1)] transition-all duration-300 group/card cursor-pointer"
              >
                <div className="relative h-[200px] overflow-hidden">
                  <img
                    src={salon.cover_image || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80"}
                    alt={salon.name}
                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  {salon.is_verified && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5C842] text-[#111] text-[10px] font-bold">
                      <BadgeCheck size={9} /> Verified
                    </span>
                  )}
                  {user && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(salon.id); }}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition ${
                        favorites.has(salon.id) ? "bg-[#EC4899] text-white" : "bg-white/80 text-gray-500 hover:bg-white"
                      }`}
                    >
                      <Heart size={13} fill={favorites.has(salon.id) ? "white" : "none"} />
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-[#111] text-[15px] group-hover/card:text-[#EC4899] transition-colors">{salon.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star size={12} className="text-[#F5C842]" fill="#F5C842" />
                      <span className="text-[13px] font-semibold text-[#111]">{salon.rating}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-3">
                    <MapPin size={10} /> {salon.locality}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(salon.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[10px] border border-gray-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">
                      <span className="text-[#111] font-semibold">₹{salon.price_min}</span> – ₹{salon.price_max}
                    </span>
                    <button className="px-3.5 py-1.5 rounded-full bg-[#111] text-white text-[11px] font-semibold hover:bg-[#333] transition-all">
                      Book Now
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ===== TRENDING SERVICES ===== */}
      <section className="max-w-7xl mx-auto px-6 mt-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-[28px] font-bold text-[#111]">Trending Services</h2>
            <p className="text-[13px] text-gray-400 mt-1">Most popular beauty services this week</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {TRENDING_SERVICES.map((svc, idx) => (
            <motion.div
              key={svc.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="bg-white rounded-[20px] border border-gray-100 overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_35px_rgba(236,72,153,0.1)] transition-all duration-300 cursor-pointer group"
            >
              <div className="relative h-[140px] overflow-hidden">
                <img
                  src={svc.image}
                  alt={svc.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: svc.color + "20" }}>
                    <svc.icon size={16} style={{ color: svc.color }} />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#111] text-[14px] mb-1">{svc.title}</h3>
                <p className="text-[11px] text-gray-400 mb-2 leading-relaxed">{svc.desc}</p>
                <span className="text-[13px] font-semibold text-[#EC4899]">Starting from {svc.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== POPULAR LOCATIONS ===== */}
      <section className="max-w-7xl mx-auto px-6 mt-14 mb-14">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-[28px] font-bold text-[#111]">Popular Locations</h2>
            <p className="text-[13px] text-gray-400 mt-1">Explore salons across Mumbai</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {POPULAR_LOCATIONS.map((loc, idx) => (
            <motion.div
              key={loc.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              whileHover={{ scale: 1.04 }}
              className="relative h-[200px] rounded-[20px] overflow-hidden cursor-pointer group"
            >
              <img
                src={loc.image}
                alt={loc.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-center">
                <h3 className="font-display text-white text-[18px] font-bold mb-1">{loc.name}</h3>
                <p className="text-white/70 text-[12px]">{loc.count} Salons</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER CTA ===== */}
      <section className="mx-6 mb-12 max-w-7xl lg:mx-auto">
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
