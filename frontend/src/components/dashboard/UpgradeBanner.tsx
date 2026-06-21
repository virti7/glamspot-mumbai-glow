"use client";

import Link from "next/link";
import { Crown } from "lucide-react";

export function UpgradeBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-[18px] h-[110px] group fade-up hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-250"
      style={{
        background: "linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 40%, #FFF1F2 100%)",
        animationDelay: "0.45s",
      }}
    >
      <div className="relative z-10 flex items-center h-full px-8 md:px-10">
        {/* Left Content */}
        <div className="flex-1">
          <h3 className="font-display text-[19px] font-bold text-[#111] mb-1">
            Upgrade to Premium <span>✨</span>
          </h3>
          <p className="text-[12px] text-gray-500 font-medium">
            Unlock unlimited AI scans, priority booking & exclusive offers.
          </p>
        </div>

        {/* Button */}
        <Link
          href="/subscription"
          className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-[13px] font-semibold shadow-[0_4px_14px_rgba(236,72,153,0.3)] hover:shadow-[0_6px_20px_rgba(236,72,153,0.45)] hover:scale-105 transition-all duration-200 shrink-0 mr-8"
        >
          <Crown size={14} />
          Upgrade Now
        </Link>

        {/* Decorative Image */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[28%] overflow-hidden rounded-r-[18px]">
          <img
            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=90"
            alt="Beauty products"
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
}
