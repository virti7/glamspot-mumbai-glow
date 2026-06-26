"use client";

import { useState } from "react";
import { StatCard } from "./StatCard";
import { BarChart3, Calendar, CheckCircle, Clock, Heart, Sparkles, Star } from "lucide-react";

interface StatsGridProps {
  stats: {
    totalBookings: number;
    completedBookings: number;
    upcomingBookings: number;
    favoriteSalons: number;
    glamScansUsed: number;
    glamScansRemaining: number;
  };
}

const statConfig = [
  {
    key: "totalBookings",
    label: "Total Bookings",
    icon: Calendar,
    color: "#EC4899",
    bgColor: "#FDF2F8",
    growth: 20,
  },
  {
    key: "completedBookings",
    label: "Completed",
    icon: CheckCircle,
    color: "#22C55E",
    bgColor: "#F0FDF4",
    growth: 15,
  },
  {
    key: "upcomingBookings",
    label: "Upcoming",
    icon: Clock,
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    growth: 10,
  },
  {
    key: "favoriteSalons",
    label: "Favorites",
    icon: Heart,
    color: "#FB7185",
    bgColor: "#FFF1F2",
    growth: 25,
  },
  {
    key: "glamScansUsed",
    label: "AI Scans Used",
    icon: Sparkles,
    color: "#A855F7",
    bgColor: "#FAF5FF",
    growth: 30,
  },
  {
    key: "glamScansRemaining",
    label: "Scans Remaining",
    icon: Star,
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    growth: null,
  },
];

const filters = ["This Month", "Last 3 Months", "All Time"];

export function StatsGrid({ stats }: StatsGridProps) {
  const [activeFilter, setActiveFilter] = useState("This Month");
  const [showFilter, setShowFilter] = useState(false);

  return (
    <section className="fade-up" style={{ animationDelay: "0.15s" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <BarChart3 size={18} className="text-gray-600" />
          <h2 className="font-display text-[18px] font-bold text-[#111]">Quick Stats</h2>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-[#E5E7EB]/60 text-[12.5px] font-medium text-gray-600 hover:border-[#EC4899]/30 hover:text-[#EC4899] transition-all duration-200 shadow-sm"
          >
            <Calendar size={13} className="text-gray-400" />
            {activeFilter}
            <ChevronIcon />
          </button>

          {showFilter && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFilter(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-[#E5E7EB]/60 py-1.5 z-40 modal-in">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setActiveFilter(f); setShowFilter(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[12.5px] transition ${
                      activeFilter === f
                        ? "text-[#EC4899] bg-pink-50/70 font-semibold"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statConfig.map((cfg, i) => (
          <StatCard
            key={cfg.key}
            label={cfg.label}
            value={(stats as Record<string, number>)[cfg.key] ?? 0}
            icon={<cfg.icon size={20} style={{ color: cfg.color }} strokeWidth={2} />}
            color={cfg.color}
            bgColor={cfg.bgColor}
            growth={cfg.growth}
            delay={i}
          />
        ))}
      </div>
    </section>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-400">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
