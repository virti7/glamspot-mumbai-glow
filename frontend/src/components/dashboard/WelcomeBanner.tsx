"use client";

import { useAuth } from "@/contexts/AuthContext";

export function WelcomeBanner() {
  const { profile, subscription } = useAuth();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "June 2026";

  return (
    <div className="relative overflow-hidden rounded-2xl h-[220px] md:h-[240px] mt-20 md:mt-32 fade-up group bg-gradient-to-br from-[#EC4899] to-[#DB2777]">
      <div className="relative z-10 flex items-center justify-between h-full px-8 lg:px-12">
        {/* Left Content */}
        <div className="flex items-center gap-6 z-20 w-full md:w-[40%]">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center text-white text-[42px] font-bold overflow-hidden ring-[4px] ring-white/30 shadow-xl shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              profile?.full_name?.charAt(0)?.toUpperCase() || "V"
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-[14px] text-white/80 font-medium">Welcome back,</p>
              <h1 className="font-display text-[32px] font-bold text-white leading-tight truncate">
                {profile?.full_name || "User"}! <span>✨</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 text-white text-[12px] font-semibold border border-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                {subscription?.display_name || "Free"} Plan
              </span>
              <span className="text-[12.5px] text-white/60 whitespace-nowrap">
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[60%] rounded-r-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#EC4899] via-[#EC4899]/20 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1920&q=90"
            alt="Luxury salon interior"
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
}
