"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star, MapPin, Phone, Clock, BadgeCheck, Heart, Share2,
  ChevronRight, ArrowUpRight, Wifi, Wind, Car, CreditCard,
  ShieldCheck, Scissors, Quote, Sparkles, Users, Check,
  ArrowLeft, Clock3, Calendar, MessageCircle, ImagePlus,
  Crown,
} from "lucide-react";
import type { SalonDetail } from "@/services/salon.service";
import { salonService } from "@/services/salon.service";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { SalonCard } from "@/components/salons/SalonCard";

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80",
  "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80",
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Air Conditioning": <Wind size={20} />,
  "Free WiFi": <Wifi size={20} />,
  Parking: <Car size={20} />,
  "Card Payments": <CreditCard size={20} />,
  "Sanitized Equipment": <ShieldCheck size={20} />,
  "Expert Stylists": <Scissors size={20} />,
};

const DEFAULT_AMENITIES = [
  "Air Conditioning",
  "Free WiFi",
  "Parking",
  "Card Payments",
  "Sanitized Equipment",
  "Expert Stylists",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string | null | undefined) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${hr12}:${m} ${ampm}`;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} className="text-[#F5C842]" fill="#F5C842" />
      <span className="font-bold text-[#111]">{rating.toFixed(1)}</span>
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-[22px] font-bold text-[#111] mb-5">{children}</h2>
  );
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.5, delay },
  };
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= Math.round(rating) ? "text-[#F5C842]" : "text-gray-200"}
          fill={s <= Math.round(rating) ? "#F5C842" : "none"}
        />
      ))}
    </div>
  );
}

interface Props {
  salon: SalonDetail;
}

export function SalonDetailClient({ salon }: Props) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [similarSalons, setSimilarSalons] = useState<any[]>([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  const galleryImages = useMemo(() => {
    const images: string[] = [];
    if (salon.images && salon.images.length > 0) {
      if (salon.cover_image) images.push(salon.cover_image);
      salon.images.forEach((img) => {
        if (img.image_url !== salon.cover_image) images.push(img.image_url);
      });
    } else {
      if (salon.cover_image) images.push(salon.cover_image);
      images.push(...DEFAULT_IMAGES.filter((img) => img !== salon.cover_image));
    }
    return images.slice(0, 5);
  }, [salon.cover_image, salon.images]);

  useEffect(() => {
    if (user) {
      userService
        .getFavorites()
        .then((favs) => setIsFavorite(favs.some((f) => f.salon_id === salon.id)))
        .catch(() => {});
    }
  }, [user, salon.id]);

  useEffect(() => {
    salonService
      .getAll({ locality: salon.locality || undefined, limit: 5 })
      .then((res) =>
        setSimilarSalons(res.salons.filter((s) => s.id !== salon.id).slice(0, 4))
      )
      .catch(() => {});
  }, [salon.id, salon.locality]);

  const handleToggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorite) {
        await userService.removeFavorite(salon.id);
        setIsFavorite(false);
      } else {
        await userService.addFavorite(salon.id);
        setIsFavorite(true);
      }
    } catch {}
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: salon.name,
        text: salon.description || `Check out ${salon.name} on GlamSpot`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const openingTime = formatTime(salon.opening_time);
  const closingTime = formatTime(salon.closing_time);

  const services = salon.services || [];
  const amenities = (salon.amenities?.length ? salon.amenities : DEFAULT_AMENITIES) as string[];
  const hours = salon.hours || [];
  const staff = salon.staff || [];
  const reviews = salon.reviews || [];
  const today = new Date().getDay();

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/salons"
            className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#111] transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Back to Salons
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-gray-500 hover:text-[#111] hover:bg-gray-100 transition-all font-medium"
            >
              <Share2 size={14} /> Share
            </button>
            {user && (
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all font-medium ${
                  isFavorite
                    ? "text-[#EC4899] bg-[#EC4899]/10"
                    : "text-gray-500 hover:text-[#111] hover:bg-gray-100"
                }`}
              >
                <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? "Saved" : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Image Gallery */}
        <motion.section {...fadeUp(0)} className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 rounded-[24px] overflow-hidden h-auto lg:h-[420px]">
            <div className="lg:col-span-2 relative h-[300px] lg:h-full overflow-hidden group">
              <Image
                src={galleryImages[0]}
                alt={`${salon.name} cover`}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
            <div className="hidden lg:grid lg:col-span-2 grid-cols-2 grid-rows-2 gap-2 h-full">
              {galleryImages.slice(1, 5).map((img, i) => (
                <div key={i} className="relative overflow-hidden group cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                  <Image
                    src={img}
                    alt={`${salon.name} photo ${i + 2}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowAllPhotos(true)}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-200 text-[12px] font-semibold text-[#111] hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <ImagePlus size={16} />
            View All Photos
            <ChevronRight size={14} />
          </button>
        </motion.section>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Salon Header */}
            <motion.section {...fadeUp(0.1)} className="mb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h1 className="font-display text-[32px] lg:text-[38px] font-bold text-[#111] leading-tight">
                      {salon.name}
                    </h1>
                    {salon.is_claimed && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white text-[11px] font-bold shadow-md">
                        <Crown size={12} /> Owner Verified
                      </span>
                    )}
                    {salon.is_verified && !salon.is_claimed && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-[#F5C842] to-[#F59E0B] text-[#111] text-[11px] font-bold shadow-sm">
                        <BadgeCheck size={12} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[13px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-[#F5C842]" fill="#F5C842" />
                      <span className="font-semibold text-[#111]">{salon.rating.toFixed(1)}</span>
                      <span>({salon.reviews_count} reviews)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} />
                      {salon.address || salon.locality || salon.city}
                    </span>
                    {salon.phone && (
                      <a href={`tel:${salon.phone}`} className="flex items-center gap-1 hover:text-[#EC4899] transition-colors">
                        <Phone size={13} />
                        {salon.phone}
                      </a>
                    )}
                  </div>
                  {(openingTime || closingTime) && (
                    <div className="flex items-center gap-1.5 mt-3 text-[13px] text-green-600 font-medium">
                      <Clock size={14} />
                      Open Today: {openingTime} – {closingTime}
                    </div>
                  )}
                </div>
              </div>
            </motion.section>

            {/* Quick Stats */}
            <motion.section {...fadeUp(0.15)} className="mb-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Star, label: "Rating", value: salon.rating.toFixed(1), sub: "Stars", color: "#F5C842" },
                  { icon: Users, label: "Reviews", value: salon.reviews_count, sub: "Total reviews", color: "#8B5CF6" },
                  { icon: CreditCard, label: "Price Range", value: salon.price_min ? `₹${salon.price_min}` : "—", sub: salon.price_max ? `to ₹${salon.price_max}` : "", color: "#EC4899" },
                  { icon: BadgeCheck, label: "Status", value: salon.is_claimed ? "Owner Managed" : "Listed", sub: salon.is_claimed ? "Business verified" : "Standard listing", color: "#22C55E" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="bg-white rounded-[16px] border border-gray-100 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: stat.color + "15" }}
                      >
                        <stat.icon size={18} style={{ color: stat.color }} />
                      </div>
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{stat.label}</span>
                    </div>
                    <div className="text-[20px] font-bold text-[#111]">{stat.value}</div>
                    <div className="text-[12px] text-gray-400">{stat.sub}</div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Services */}
            <motion.section {...fadeUp(0.2)} className="mb-10">
              <SectionTitle>Services</SectionTitle>
              {services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((svc, i) => (
                    <motion.div
                      key={svc.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="group bg-white rounded-[16px] border border-gray-100 p-4 hover:shadow-[0_8px_25px_rgba(236,72,153,0.08)] hover:border-[#EC4899]/20 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#111] text-[15px]">{svc.name}</h4>
                          {svc.description && (
                            <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-1">{svc.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[16px] font-bold text-[#EC4899]">
                              ₹{svc.discounted_price || svc.price}
                            </span>
                            {svc.discounted_price && (
                              <span className="text-[12px] text-gray-400 line-through">₹{svc.price}</span>
                            )}
                            {svc.duration_minutes && (
                              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                                <Clock3 size={12} />
                                {svc.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="shrink-0 px-4 py-2 rounded-full bg-[#EC4899] text-white text-[12px] font-semibold hover:bg-[#DB2777] hover:shadow-[0_4px_15px_rgba(236,72,153,0.3)] transition-all opacity-0 group-hover:opacity-100 lg:opacity-100">
                          Book
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[16px] border border-gray-100 p-8 text-center">
                  <Sparkles size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-[14px] text-gray-400">Services coming soon</p>
                </div>
              )}
            </motion.section>

            {/* Staff (show if available) */}
            {staff.length > 0 && (
              <motion.section {...fadeUp(0.22)} className="mb-10">
                <SectionTitle>Our Team</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {staff.map((member, i) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="bg-white rounded-[16px] border border-gray-100 p-4 text-center"
                    >
                      <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#EC4899]/20 to-[#DB2777]/20 flex items-center justify-center mb-3">
                        {member.photo || member.avatar_url ? (
                          <Image src={member.photo || member.avatar_url!} alt={member.name} width={64} height={64} className="rounded-full object-cover w-full h-full" />
                        ) : (
                          <span className="text-[20px] font-bold text-[#EC4899]">{member.name.charAt(0)}</span>
                        )}
                      </div>
                      <h4 className="font-semibold text-[#111] text-[14px]">{member.name}</h4>
                      <p className="text-[12px] text-gray-400">{member.role || member.specialization || "Stylist"}</p>
                      {member.experience && (
                        <p className="text-[11px] text-gray-300 mt-1">{member.experience} experience</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* About */}
            <motion.section {...fadeUp(0.25)} className="mb-10">
              <SectionTitle>About</SectionTitle>
              <div className="bg-white rounded-[16px] border border-gray-100 p-6">
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  {salon.description ||
                    `Premium beauty salon located in ${salon.city} offering professional hair, skin and grooming services.`}
                </p>
              </div>
            </motion.section>

            {/* Amenities */}
            <motion.section {...fadeUp(0.3)} className="mb-10">
              <SectionTitle>Amenities</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenities.map((amenity, i) => (
                  <motion.div
                    key={amenity}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="flex items-center gap-3 bg-white rounded-[12px] border border-gray-100 p-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      {AMENITY_ICONS[amenity] || <Check size={18} className="text-green-500" />}
                    </div>
                    <span className="text-[13px] font-medium text-[#111]">{amenity}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Business Hours */}
            {hours.length > 0 && (
              <motion.section {...fadeUp(0.32)} className="mb-10">
                <SectionTitle>Business Hours</SectionTitle>
                <div className="bg-white rounded-[16px] border border-gray-100 p-6">
                  <div className="space-y-2">
                    {hours.map((h) => (
                      <div key={h.id} className={`flex items-center justify-between py-1.5 ${h.day_of_week === today ? "text-[#111] font-semibold" : "text-gray-500"}`}>
                        <span className="text-[14px]">{FULL_DAY_NAMES[h.day_of_week]}</span>
                        {h.is_closed ? (
                          <span className="text-[13px] text-red-400">Closed</span>
                        ) : (
                          <span className="text-[13px]">
                            {formatTime(h.open_time)} – {formatTime(h.close_time)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}

            {/* Reviews */}
            <motion.section {...fadeUp(0.35)} className="mb-10">
              <SectionTitle>Reviews</SectionTitle>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-[16px] border border-gray-100 p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[14px] font-semibold text-gray-500 shrink-0">
                          {review.user?.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-[#111] text-[14px]">{review.user?.full_name || "Anonymous"}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <StarDisplay rating={review.rating} />
                                <span className="text-[11px] text-gray-400">
                                  {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
                          )}
                          {review.owner_reply && (
                            <div className="mt-3 ml-4 pl-3 border-l-2 border-[#EC4899] bg-[#EC4899]/5 rounded-r-lg p-3">
                              <p className="text-[11px] font-semibold text-[#EC4899] mb-1">Owner Response</p>
                              <p className="text-[12px] text-gray-600">{review.owner_reply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[16px] border border-gray-100 p-8 text-center">
                  <Quote size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-[14px] text-gray-400 mb-2">No reviews yet</p>
                  <p className="text-[12px] text-gray-300">Be the first to review this salon</p>
                </div>
              )}
            </motion.section>

            {/* Location */}
            <motion.section {...fadeUp(0.4)} className="mb-10">
              <SectionTitle>Location</SectionTitle>
              <div className="bg-white rounded-[16px] border border-gray-100 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin size={18} className="text-[#EC4899] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] text-[#111] font-medium">
                      {salon.address || `${salon.locality || ""}, ${salon.city}`}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      {salon.city}, {salon.state || "Maharashtra"}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    salon.address || `${salon.name} ${salon.city}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#111] text-white text-[13px] font-semibold hover:bg-[#333] transition-all"
                >
                  <MapPin size={14} />
                  Get Directions
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </motion.section>

            {/* Similar Salons */}
            {similarSalons.length > 0 && (
              <motion.section {...fadeUp(0.45)} className="mb-10">
                <SectionTitle>Similar Salons</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {similarSalons.map((s, i) => (
                    <SalonCard
                      key={s.id}
                      salon={s}
                      index={i}
                      isFavorite={false}
                      onToggleFavorite={() => {}}
                      user={user}
                    />
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Booking Sidebar */}
          <motion.aside
            {...fadeUp(0.2)}
            className="hidden lg:block w-[340px] shrink-0"
          >
            <div className="sticky top-20">
              <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="w-14 h-14 rounded-[16px] overflow-hidden relative bg-gray-50">
                    {salon.logo_image ? (
                      <Image src={salon.logo_image} alt={salon.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[20px] font-bold text-[#EC4899]">
                        {salon.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111] text-[16px]">{salon.name}</h3>
                    <span className="flex items-center gap-1 text-[12px] text-gray-400">
                      <Star size={11} className="text-[#F5C842]" fill="#F5C842" />
                      {salon.rating.toFixed(1)} ({salon.reviews_count})
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-400">Rating</span>
                    <span className="font-semibold text-[#111]">
                      <StarRating rating={salon.rating} size={14} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-400">Price Range</span>
                    <span className="font-semibold text-[#111]">
                      ₹{salon.price_min || "—"}{salon.price_max ? ` – ₹${salon.price_max}` : ""}
                    </span>
                  </div>
                  {openingTime && closingTime && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-400">Hours</span>
                      <span className="font-semibold text-green-600">{openingTime} – {closingTime}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white text-[14px] font-semibold hover:shadow-[0_8px_25px_rgba(236,72,153,0.35)] transition-all duration-300 flex items-center justify-center gap-2">
                    <Calendar size={15} />
                    Book Appointment
                  </button>
                  {salon.phone && (
                    <>
                      <a
                        href={`tel:${salon.phone}`}
                        className="w-full py-3 rounded-full border border-gray-200 text-[13px] font-semibold text-[#111] hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Phone size={14} />
                        Call Salon
                      </a>
                      <a
                        href={`https://wa.me/${salon.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-full border border-green-200 text-[13px] font-semibold text-green-600 hover:bg-green-50 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </a>
                    </>
                  )}
                </div>

                {salon.is_claimed && (
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-[12px] text-gray-500">
                    <Crown size={14} className="text-[#EC4899]" />
                    Owner Verified · Managed & updated by the salon
                  </div>
                )}
                {salon.is_verified && !salon.is_claimed && (
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-[12px] text-gray-500">
                    <BadgeCheck size={14} className="text-[#F5C842]" />
                    Verified salon · Trusted by GlamSpot
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </div>

        {/* Mobile Sticky Book Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 p-4 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <div className="flex items-center gap-1 text-[14px] font-bold text-[#111]">
                ₹{salon.price_min || "—"}{salon.price_max ? ` – ₹${salon.price_max}` : ""}
              </div>
              <div className="flex items-center gap-1 text-[12px] text-gray-400">
                <Star size={11} className="text-[#F5C842]" fill="#F5C842" />
                {salon.rating.toFixed(1)} ({salon.reviews_count})
              </div>
            </div>
            <button className="px-8 py-3 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white text-[14px] font-semibold shadow-[0_4px_15px_rgba(236,72,153,0.3)] flex items-center gap-2">
              <Calendar size={15} />
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
