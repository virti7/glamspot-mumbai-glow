"use client";

import Link from "next/link";
import {
  Scissors, Heart, Calendar, Sparkles, ScanEye, Crown, User,
  Clock, MapPin, ArrowRight,
} from "lucide-react";

const quickAccessCards = [
  {
    title: "Salon Booking",
    description: "Discover & book top salons near you",
    href: "/salons",
    icon: Scissors,
    gradient: "linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 50%, #FFF1F2 100%)",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=90",
    iconColor: "#EC4899",
    buttonColor: "#EC4899",
  },
  {
    title: "Favorites",
    description: "View your saved salons",
    href: "/favorites",
    icon: Heart,
    gradient: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #F5F3FF 100%)",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1920&q=90",
    iconColor: "#A855F7",
    buttonColor: "#A855F7",
  },
  {
    title: "Booking History",
    description: "Past & upcoming appointments",
    href: "/bookings",
    icon: Calendar,
    gradient: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FFFBEB 100%)",
    image: "https://images.unsplash.com/photo-1559357490-b22da9c0f16f?w=1920&q=90",
    iconColor: "#F59E0B",
    buttonColor: "#F59E0B",
  },
  {
    title: "GlamAI",
    description: "AI-powered beauty analysis & insights",
    href: "/glamai",
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #F0F9FF 100%)",
    image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1920&q=90",
    iconColor: "#0EA5E9",
    buttonColor: "#0EA5E9",
  },
  {
    title: "AI Scans",
    description: "View your previous AI scan results",
    href: "/glamai",
    icon: ScanEye,
    gradient: "linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 50%, #F0FDF4 100%)",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1920&q=90",
    iconColor: "#22C55E",
    buttonColor: "#22C55E",
  },
  {
    title: "Subscription",
    description: "Manage your plan & billing",
    href: "/subscription",
    icon: Crown,
    gradient: "linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 50%, #FFF1F2 100%)",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1920&q=90",
    iconColor: "#EC4899",
    buttonColor: "#EC4899",
  },
  {
    title: "Profile Settings",
    description: "Update your account details",
    href: "/profile",
    icon: User,
    gradient: "linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 50%, #FAF5FF 100%)",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1920&q=90",
    iconColor: "#A855F7",
    buttonColor: "#A855F7",
  },
  {
    title: "My Appointments",
    description: "View upcoming & past sessions",
    href: "/bookings",
    icon: Clock,
    gradient: "linear-gradient(135deg, #FEF9C3 0%, #FDE68A 50%, #FEFCE8 100%)",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1920&q=90",
    iconColor: "#EAB308",
    buttonColor: "#EAB308",
  },
  {
    title: "Recommended Salons",
    description: "Curated picks just for you",
    href: "/salons",
    icon: MapPin,
    gradient: "linear-gradient(135deg, #FFE4E6 0%, #FECDD3 50%, #FFF1F2 100%)",
    image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1920&q=90",
    iconColor: "#F43F5E",
    buttonColor: "#F43F5E",
  },
];

export function QuickAccessCards() {
  return (
    <section className="fade-up" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center gap-2.5 mb-5">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-gray-600">
          <rect x="2" y="2" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
        </svg>
        <h2 className="font-display text-[18px] font-bold text-[#111]">Quick Access</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickAccessCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="relative flex overflow-hidden rounded-[18px] h-[170px] group cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] transition-all duration-250"
            style={{ background: card.gradient }}
          >
            {/* Left Content */}
            <div className="relative z-10 flex flex-col justify-between w-1/2 p-5">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 bg-white/80 shadow-sm">
                  <card.icon size={18} style={{ color: card.iconColor }} />
                </div>
                <h3 className="font-display text-[15px] font-bold text-[#111] mb-0.5">
                  {card.title}
                </h3>
                <p className="text-[11.5px] text-gray-600 leading-snug pr-2">
                  {card.description}
                </p>
              </div>
              <div className="flex justify-end">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-200"
                  style={{ backgroundColor: card.buttonColor }}
                >
                  <ArrowRight size={15} />
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden rounded-r-[18px]">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
