"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Star, BadgeCheck, TrendingUp } from "lucide-react";

const collageImages = [
  {
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80",
    alt: "Salon interior",
    width: 220,
    height: 280,
    top: 0,
    right: 0,
    rotate: -4,
    z: 5,
  },
  {
    src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80",
    alt: "Hair styling",
    width: 170,
    height: 210,
    top: 60,
    right: 150,
    rotate: 6,
    z: 4,
  },
  {
    src: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&q=80",
    alt: "Beauty treatment",
    width: 190,
    height: 240,
    top: 140,
    right: 30,
    rotate: -2,
    z: 3,
  },
];

const floatingCards = [
  { icon: Star, label: "4.9", sub: "Rated", color: "#F5C842", top: 20, right: 190 },
  { icon: BadgeCheck, label: "Verified", sub: "Salons", color: "#22C55E", top: 190, right: 10 },
  { icon: TrendingUp, label: "Trending", sub: "Bookings", color: "#EC4899", top: 260, right: 140 },
];

const stats = [
  { value: "500+", label: "Salons" },
  { value: "4.8", label: "Avg Rating" },
  { value: "10k+", label: "Bookings" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[480px] overflow-hidden" style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFFDFD 100%)" }}>
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-pink-200/30 blur-3xl" />
      <div className="absolute -bottom-24 right-1/3 w-80 h-80 rounded-full bg-rose-200/20 blur-3xl" />

      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 py-16 lg:py-20 flex items-center">
        <div className="flex-1 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#EC4899]/10 text-[#EC4899] text-[12px] font-semibold mb-5 border border-[#EC4899]/20">
              <Sparkles size={13} />
              Premium Beauty Marketplace
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-[44px] lg:text-[56px] font-bold text-[#111] leading-[1.05] mb-4"
          >
            Discover Mumbai&apos;s Best
            <span className="text-[#EC4899] block">Beauty Salons</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[15px] text-gray-500 font-medium mb-8 max-w-lg leading-relaxed"
          >
            Find trusted salons, compare ratings, explore services and book instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center gap-4 mb-10"
          >
            <a
              href="#featured"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#EC4899] text-white text-[14px] font-semibold hover:bg-[#DB2777] hover:scale-105 transition-all duration-300 shadow-[0_8px_30px_rgba(236,72,153,0.35)]"
            >
              Explore Salons
              <ArrowRight size={15} />
            </a>
            <Link
              href="/glamai"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#111] text-[14px] font-semibold border border-gray-200 hover:border-[#EC4899] hover:text-[#EC4899] hover:scale-105 transition-all duration-300 shadow-sm"
            >
              Try GlamAI
              <Sparkles size={14} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center gap-8"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-[22px] font-bold text-[#111]">{stat.value}</div>
                <div className="text-[12px] text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="hidden lg:block relative w-[48%] h-[400px] ml-12">
          {collageImages.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.12 }}
              className="absolute rounded-[20px] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.12)] border-2 border-white/60 hover:shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-shadow duration-500"
              style={{
                top: img.top,
                right: img.right,
                width: img.width,
                height: img.height,
                transform: `rotate(${img.rotate}deg)`,
                zIndex: img.z,
              }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}

          {floatingCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.15 }}
              className="absolute flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-[16px] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-white/50"
              style={{ top: card.top, right: card.right, zIndex: 10 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + "15" }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
              <div>
                <div className="text-[15px] font-bold text-[#111]">{card.label}</div>
                <div className="text-[11px] text-gray-400">{card.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
