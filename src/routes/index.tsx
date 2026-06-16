import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadScanImage, analyzeScan } from "@/lib/glamai.functions";
import {
  MapPin,
  Star,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Scissors,
  Sparkles,
  Heart,
  MessageCircle,
  Send,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Camera,
  Upload,
  Check,
  Phone,
  Mail,
  Menu,
  X,
  User,
  Clock,
  Calendar,
  ArrowRight,
  Zap,
  Shield,
  Award,
  Bookmark,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GlamSpot — Mumbai's #1 Salon Platform" },
      {
        name: "description",
        content:
          "Discover, compare and book Mumbai's finest salons. Get an AI hair & skin diagnosis with GlamAI.",
      },
      { property: "og:title", content: "GlamSpot — Mumbai's Beauty OS" },
      {
        property: "og:description",
        content:
          "Skip the Instagram DMs. Find, compare and book top salons near you — powered by AI.",
      },
    ],
  }),
  component: Index,
});

async function fetchInstagramReels(accessToken: string) {
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption&access_token=${accessToken}`,
    );
    const data = await res.json();
    return (
      data.data?.filter(
        (item: { media_type: string }) => item.media_type === "VIDEO" || item.media_type === "REEL",
      ) || []
    );
  } catch {
    return null;
  }
}

/* ---------------- Data ---------------- */
const SALONS = [
  {
    id: 1,
    name: "Mirrors Salon & Spa",
    locality: "Bandra West",
    services: ["Hair", "Bridal", "Skin"],
    rating: 4.9,
    reviews: 124,
    priceMin: 500,
    priceMax: 2000,
    tags: ["Keratin", "Bridal", "Color"],
    badge: "Celeb Stylist",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80",
  },
  {
    id: 2,
    name: "The Gloss Studio",
    locality: "Juhu",
    services: ["Hair", "Skin"],
    rating: 4.7,
    reviews: 89,
    priceMin: 800,
    priceMax: 3500,
    tags: ["Balayage", "Color", "Facial"],
    badge: null,
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80",
  },
  {
    id: 3,
    name: "Luxe Locks",
    locality: "Andheri West",
    services: ["Hair", "Men's Grooming"],
    rating: 4.8,
    reviews: 203,
    priceMin: 400,
    priceMax: 1800,
    tags: ["Hair Spa", "Men's", "Keratin"],
    badge: null,
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
  },
  {
    id: 4,
    name: "Trim & Glow",
    locality: "Powai",
    services: ["Skin", "Nails"],
    rating: 4.6,
    reviews: 67,
    priceMin: 300,
    priceMax: 1200,
    tags: ["Facials", "Nails", "Waxing"],
    badge: null,
    image: "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80",
  },
  {
    id: 5,
    name: "Studio Noir",
    locality: "Colaba",
    services: ["Bridal", "Hair", "Skin"],
    rating: 4.9,
    reviews: 312,
    priceMin: 1200,
    priceMax: 6000,
    tags: ["Bridal", "Premium", "Color"],
    badge: "Celeb Stylist",
    image: "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&q=80",
  },
  {
    id: 6,
    name: "BeautyBox",
    locality: "Kurla",
    services: ["Nails", "Skin"],
    rating: 4.5,
    reviews: 45,
    priceMin: 200,
    priceMax: 900,
    tags: ["Nails", "Waxing", "Facial"],
    badge: null,
    image: "https://images.unsplash.com/photo-1470259078422-826894b933aa?w=600&q=80",
  },
];

const LOCALITIES = ["All Mumbai", "Bandra", "Andheri", "Juhu", "Powai", "Colaba", "Kurla"];
const SERVICES = ["All Services", "Hair", "Skin", "Bridal", "Nails", "Men's Grooming"];

const REELS = [
  {
    svc: "Keratin Transformation",
    salon: "Mirrors Salon",
    username: "@mirrorssalon",
    image: "https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=300&h=500&fit=crop&q=80",
    likes: "12.4k",
    comments: 342,
  },
  {
    svc: "Bridal Glam",
    salon: "The Gloss Studio",
    username: "@theglossstu",
    image: "https://images.unsplash.com/photo-1519735777090-ec97162dc266?w=300&h=500&fit=crop&q=80",
    likes: "9.1k",
    comments: 211,
  },
  {
    svc: "Balayage Session",
    salon: "Luxe Locks",
    username: "@luxelocksmumbai",
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=300&h=500&fit=crop&q=80",
    likes: "7.8k",
    comments: 187,
  },
  {
    svc: "Hair Spa Day",
    salon: "Trim & Glow",
    username: "@trimglowpowai",
    image: "https://images.unsplash.com/photo-1582095133179-bfd08e2fb6b8?w=300&h=500&fit=crop&q=80",
    likes: "5.3k",
    comments: 122,
  },
  {
    svc: "Men's Fade Cut",
    salon: "Studio Noir",
    username: "@studionomumbai",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=500&fit=crop&q=80",
    likes: "4.9k",
    comments: 98,
  },
  {
    svc: "Nail Art",
    salon: "BeautyBox",
    username: "@beautyboxkurla",
    image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=300&h=500&fit=crop&q=80",
    likes: "8.2k",
    comments: 215,
  },
  {
    svc: "Facial Glow Up",
    salon: "Juhu Glow Studio",
    username: "@juhuglow",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=300&h=500&fit=crop&q=80",
    likes: "6.6k",
    comments: 154,
  },
  {
    svc: "Hair Color",
    salon: "Bandra Blowout Bar",
    username: "@bandrabblowout",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=500&fit=crop&q=80",
    likes: "3.7k",
    comments: 88,
  },
];

const WHAT_WE_DO = [
  {
    title: "Hair",
    icon: <Scissors size={20} />,
    items: [
      "Women's & Men's Cuts & Styling",
      "Highlights, Balayage, Ombre & Color",
      "Keratin & Smoothening Treatments",
      "Hair Spa & Deep Conditioning Masks",
    ],
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80",
  },
  {
    title: "Skin",
    icon: <Sparkles size={20} />,
    items: [
      "Hydrafacials & Deep Cleanups",
      "Tan Removal & Skin Brightening",
      "Anti-Acne & Scar Treatments",
      "Bridal Pre-Glow Packages",
    ],
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&q=80",
  },
  {
    title: "Bridal",
    icon: <Award size={20} />,
    items: [
      "Full Bridal Makeup & Draping",
      "Pre-Bridal Packages (6 Sessions)",
      "Mehendi & Jewellery Styling",
      "Trial Makeup Sessions",
    ],
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=500&q=80",
  },
  {
    title: "Nails",
    icon: <Heart size={20} />,
    items: [
      "Gel & Acrylic Extensions",
      "Nail Art, Chrome & Ombre Finish",
      "Classic Manicure & Pedicure",
      "Nail Repair & Strengthening",
    ],
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&q=80",
  },
];

const STYLISTS = [
  {
    name: "Priya Sharma",
    role: "Hair Artist",
    exp: "8 years exp",
    loc: "Bandra",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80",
  },
  {
    name: "Rohan Mehta",
    role: "Master Colorist",
    exp: "12 years",
    loc: "Juhu",
    image: "https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400&q=80",
  },
  {
    name: "Aisha Khan",
    role: "Barber & Groomer",
    exp: "6 years",
    loc: "Andheri",
    image: "https://images.unsplash.com/photo-1595959183082-7b570b7e08cf?w=400&q=80",
  },
  {
    name: "Divya Patel",
    role: "Nail Technician",
    exp: "5 years",
    loc: "Powai",
    image: "https://images.unsplash.com/photo-1570158268183-d296b2892211?w=400&q=80",
  },
  {
    name: "Meera Sinha",
    role: "Bridal Expert",
    exp: "10 years",
    loc: "Colaba",
    image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&q=80",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Finally found my Bandra go-to without scrolling Instagram for hours! The GlamAI diagnosis was spot on — keratin treatment completely transformed my hair.",
    name: "Priya M.",
    loc: "Bandra",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    quote:
      "Booked my bridal package through GlamSpot 2 weeks before my wedding. Studio Noir was incredible. No DMs, no waiting — confirmed in 30 seconds.",
    name: "Sneha K.",
    loc: "Andheri",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
  },
  {
    quote:
      "GlamAI detected heat damage I didn't even know I had. Got a protein treatment done and couldn't believe the difference. This is genius.",
    name: "Rahul D.",
    loc: "Powai",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
];

const BRANDS = [
  "L'Oreal Professional",
  "Schwarzkopf",
  "Wella",
  "Kerastase",
  "OPI",
  "Dermalogica",
  "TIGI",
  "Redken",
  "Mamaearth Pro",
  "BBlunt",
  "Streax Pro",
];

const TOUR_SALONS = [
  {
    name: "Mirrors Salon & Spa",
    loc: "Bandra West",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80",
  },
  {
    name: "The Gloss Studio",
    loc: "Juhu",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200&q=80",
  },
  {
    name: "Studio Noir",
    loc: "Colaba",
    image: "https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=1200&q=80",
  },
  {
    name: "Luxe Locks",
    loc: "Andheri",
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1200&q=80",
  },
];

const EXCLUSIVE_SERVICES = [
  {
    name: "Men's Haircut",
    category: "HAIRCUT",
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&q=80",
  },
  {
    name: "Hot Towel Shave",
    category: "BEARD SHAVE",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&q=80",
  },
  {
    name: "Mustache Trim",
    category: "MOUSTACHE",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&q=80",
  },
  {
    name: "Keratin Treatment",
    category: "HAIR TREATMENT",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80",
  },
  {
    name: "Balayage & Color",
    category: "HAIR COLOR",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80",
  },
  {
    name: "Bridal Makeup",
    category: "BRIDAL",
    image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=500&q=80",
  },
  {
    name: "Nail Art & Extensions",
    category: "NAILS",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&q=80",
  },
  {
    name: "Facial & Cleanup",
    category: "SKIN CARE",
    image: "https://images.unsplash.com/photo-1570158268183-d296b2892211?w=500&q=80",
  },
  {
    name: "Hair Spa",
    category: "HAIR SPA",
    image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&q=80",
  },
];

/* ---------------- Page ---------------- */
function Index() {
  const [booking, setBooking] = useState<{ open: boolean; salon?: (typeof SALONS)[number] }>({
    open: false,
  });
  const openBooking = (s?: (typeof SALONS)[number]) => setBooking({ open: true, salon: s });
  const closeBooking = () => setBooking({ open: false });

  return (
    <div className="font-body bg-white text-[#111]">
      <Navbar onBook={() => openBooking(SALONS[0])} />
      <Hero onBook={() => openBooking()} />
      <SectionFade>
        <ReelsStrip />
      </SectionFade>
      <SectionFade>
        <GlamAI />
      </SectionFade>
      <SectionFade>
        <WhatWeDo />
      </SectionFade>
      <SectionFade>
        <ExclusiveHairServices />
      </SectionFade>
      <div className="h-px bg-[#F5C842] mx-6 md:mx-[60px]" />
      <SectionFade>
        <SalonDiscovery onBook={openBooking} />
      </SectionFade>
      <SectionFade>
        <Team />
      </SectionFade>
      <div className="h-px bg-[#F5C842] mx-6 md:mx-[60px]" />
      <SectionFade>
        <Tour360 />
      </SectionFade>
      <SectionFade>
        <Testimonials />
      </SectionFade>
      <SectionFade>
        <Brands />
      </SectionFade>
      <Footer />
      {booking.open && <BookingModal salon={booking.salon} onClose={closeBooking} />}
    </div>
  );
}

/* ---------------- Navbar ---------------- */
function Navbar({ onBook }: { onBook: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 80);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const links = [
    { l: "Discover", h: "#discover" },
    { l: "Services", h: "#what-we-do" },
    { l: "AI Diagnosis", h: "#glamai" },
    { l: "Our Team", h: "#team" },
  ];
  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 border-b ${
        scrolled ? "bg-white/90 backdrop-blur-xl border-[#E8E8E8]" : "bg-white border-[#E8E8E8]"
      }`}
      style={{ boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.06)" : "none" }}
    >
      <div className="flex items-center justify-between px-6 md:px-[60px] py-5">
        <a href="#top" className="font-display font-bold text-[#111] text-2xl tracking-tight">
          GlamSpot
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.l}
              href={l.h}
              className="text-[#333] hover:text-[#F5C842] text-[14px] transition-all duration-200 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#F5C842] after:transition-all after:duration-200 hover:after:w-full"
            >
              {l.l}
            </a>
          ))}
          <button
            onClick={onBook}
            className="text-[#333] hover:text-[#F5C842] text-[14px] transition-all duration-200 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#F5C842] after:transition-all after:duration-200 hover:after:w-full"
          >
            Book Now
          </button>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <span className="border border-[#E8E8E8] rounded-full px-4 py-2 text-[13px] text-[#333] flex items-center gap-1.5">
            <MapPin size={14} /> Mumbai
          </span>
          <button className="bg-[#111] text-white rounded-full px-5 py-2 text-[13px] font-semibold hover:bg-[#333] transition">
            Sign In
          </button>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="md:hidden text-[#111]">
          <Menu size={24} />
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-[#E8E8E8] px-6 py-6 space-y-4">
          {links.map((l) => (
            <a
              key={l.l}
              href={l.h}
              onClick={() => setOpen(false)}
              className="block text-[#333] text-base"
            >
              {l.l}
            </a>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onBook();
            }}
            className="block text-[#333] text-base"
          >
            Book Now
          </button>
          <button className="w-full bg-[#111] text-white rounded-full py-3 font-semibold">
            Sign In
          </button>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ onBook }: { onBook: () => void }) {
  const cards = [
    {
      loc: "BANDRA",
      name: "Mirrors Salon",
      svc: "Hair & Bridal",
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80",
    },
    {
      loc: "JUHU",
      name: "The Gloss Studio",
      svc: "Balayage",
      image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80",
    },
    {
      loc: "ANDHERI",
      name: "Luxe Locks",
      svc: "Color & Spa",
      image: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80",
    },
  ];
  return (
    <section
      id="top"
      className="relative min-h-screen bg-white pt-28 pb-20 px-6 md:px-[60px] overflow-hidden"
    >
      <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
        <div className="fade-up">
          <p className="text-[#999] uppercase text-[11px] tracking-[0.2em]">
            Mumbai's #1 Salon Platform
          </p>
          <h1 className="font-display font-bold text-[44px] sm:text-[56px] lg:text-[72px] leading-[1.05] mt-5">
            <span className="text-[#111] block">Mumbai's Most</span>
            <span className="text-[#111] block">Beautiful Salons.</span>
            <span className="text-[#999] block">Discovered Instantly.</span>
          </h1>
          <p className="text-[#666] text-[16px] max-w-[420px] mt-6 leading-relaxed">
            Skip the Instagram DMs. Find, compare and book top salons near you — powered by AI.
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <a
              href="#discover"
              className="bg-[#111] text-white rounded-full px-8 py-4 font-semibold text-[14px] hover:bg-[#333] transition"
            >
              Explore Salons <ArrowRight size={16} className="inline ml-1" />
            </a>
            <a
              href="#glamai"
              className="bg-transparent text-[#111] border border-[#111] rounded-full px-8 py-4 font-semibold text-[14px] hover:bg-[#111] hover:text-white transition"
            >
              <Sparkles size={14} className="inline mr-1" /> Try GlamAI — Scan Your Hair
            </a>
          </div>
          <button onClick={onBook} className="sr-only">
            hidden book
          </button>
        </div>

        <div className="relative h-[420px] sm:h-[500px] flex items-center justify-center">
          {cards.map((c, i) => (
            <div
              key={i}
              className={`absolute rounded-3xl overflow-hidden ${i === 0 ? "glam-float1 z-10 w-[200px] h-[280px] sm:w-[220px] sm:h-[300px] opacity-80" : i === 1 ? "glam-float2 z-30 w-[240px] h-[320px] sm:w-[260px] sm:h-[340px]" : "glam-float3 z-20 w-[200px] h-[280px] sm:w-[220px] sm:h-[300px] opacity-80"}`}
              style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.15)" }}
            >
              <img
                src={c.image}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(transparent 60%, rgba(0,0,0,0.7))" }}
              />
              <span className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 text-[11px] flex items-center gap-1.5 shadow-md">
                <MapPin size={12} className="text-[#111]" />
                <span className="text-[#111]">{c.loc}</span>
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-white text-[18px]">{c.name}</p>
                <p className="text-[#ccc] text-[13px]">{c.svc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-6 inset-x-0 text-center text-[#999] text-[12px] tracking-widest uppercase bounce-y">
        <ChevronRight size={14} className="inline rotate-90" /> scroll to explore
      </div>
    </section>
  );
}

/* ---------------- Section Fade Wrapper ---------------- */
function SectionFade({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`section-fade-in ${className}`}>
      {children}
    </div>
  );
}

/* ---------------- Reels Strip ---------------- */
async function fetchReelsData() {
  // TODO: Replace INSTAGRAM_ACCESS_TOKEN with real token
  // GET https://graph.instagram.com/me/media
  //   ?fields=id,media_type,media_url,thumbnail_url,permalink
  //   &access_token={INSTAGRAM_ACCESS_TOKEN}
  // Filter where media_type === "VIDEO" or "REEL"
  // Use thumbnail_url for display
  const INSTAGRAM_TOKEN = "YOUR_TOKEN_HERE";
  if (INSTAGRAM_TOKEN !== "YOUR_TOKEN_HERE") {
    const data = await fetchInstagramReels(INSTAGRAM_TOKEN);
    if (data && data.length > 0) return data;
  }
  return null;
}

function ReelsStrip() {
  const [reels, setReels] = useState(REELS);

  useEffect(() => {
    fetchReelsData().then((data) => {
      if (data && data.length > 0) {
        setReels(
          data.map(
            (item: { thumbnail_url: string; caption: string; permalink: string; id: string }) => ({
              svc: item.caption?.split("\n")[0] || "Salon Reel",
              salon: "Mumbai Salon",
              username: "@glamspotmumbai",
              image: item.thumbnail_url,
              likes: String(Math.floor(Math.random() * 10000)),
              comments: Math.floor(Math.random() * 500),
              link: item.permalink,
            }),
          ),
        );
      }
    });
  }, []);

  return (
    <section className="bg-[#F8F8F8] py-[60px]">
      <div className="text-center px-6">
        <h2 className="font-display text-[#111] text-3xl md:text-[36px] mb-3">
          Live From Mumbai Salons
        </h2>
        <p className="text-[#666] text-[14px] mb-10">Real transformations happening right now</p>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-4 w-max scroll-left">
          {[...reels, ...reels].map((r, i) => (
            <ReelCard key={`a${i}`} r={r} />
          ))}
        </div>
      </div>

      <div className="text-center mt-6">
        <span className="text-[#666] text-[13px] inline-flex items-center gap-2">
          <Sparkles size={14} /> Follow us @glamspotmumbai <Instagram size={14} />
        </span>
      </div>
    </section>
  );
}

function ReelCard({
  r,
}: {
  r: {
    svc: string;
    salon: string;
    username: string;
    image: string;
    likes: string;
    comments: number;
  };
}) {
  return (
    <div
      className="relative group rounded-[16px] overflow-hidden flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
      style={{ width: 160, height: 290 }}
    >
      <img src={r.image} alt={r.svc} className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(transparent 50%, rgba(0,0,0,0.7))" }}
      />

      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <div className="w-[24px] h-[24px] rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden border border-white/30">
          <img src={r.image} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="text-white text-[10px] font-semibold">{r.username}</span>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <Instagram size={16} className="text-white" />
      </div>

      <div className="absolute right-2 bottom-20 flex flex-col gap-3 text-white items-center">
        <div className="flex flex-col items-center gap-0.5">
          <Heart size={16} />
          <span className="text-white text-[10px]">{r.likes}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle size={16} />
          <span className="text-white text-[10px]">{r.comments}</span>
        </div>
        <Send size={16} />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-semibold text-white text-[14px] leading-tight">{r.svc}</p>
        <p className="text-[#ddd] text-[11px] mt-0.5">{r.salon}</p>
      </div>

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
        <span className="bg-white text-[#111] rounded-full px-3 py-1 text-[12px] font-semibold">
          Book This Look <ArrowRight size={12} className="inline" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- What We Do ---------------- */
function WhatWeDo() {
  const [active, setActive] = useState(0);
  return (
    <section id="what-we-do" className="bg-white text-[#111] py-24 px-6 md:px-[60px]">
      <div className="grid lg:grid-cols-2 gap-10 mb-12">
        <h2 className="font-display font-bold text-[#111] text-4xl md:text-[52px] leading-tight flex items-center">
          What We Do
          <span className="inline-block w-[2px] h-12 bg-[#F5C842] ml-4 align-middle" />
        </h2>
        <p className="text-[#666] text-[16px] max-w-[400px] self-center">
          GlamSpot connects you to Mumbai's finest salons. Whether it's a quick trim or a full
          bridal transformation, we bring the city's best to your fingertips.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          {WHAT_WE_DO.map((row, i) => {
            const open = active === i;
            return (
              <div key={row.title} className="border-t border-[#E8E8E8] py-7">
                <button
                  onClick={() => setActive(open ? -1 : i)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-display font-bold text-[#111] text-[24px] md:text-[28px] flex items-center gap-3">
                    {row.title} <span className="text-[#F5C842]">{row.icon}</span>
                  </span>
                  <span
                    className={`w-8 h-8 rounded-full border border-[#111] flex items-center justify-center text-[#111] text-[14px] transition-all duration-300 hover:bg-[#F5C842] hover:border-[#F5C842] ${open ? "rotate-45" : ""}`}
                  >
                    <ArrowRight size={14} />
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{ maxHeight: open ? 500 : 0 }}
                >
                  <ul className="pt-4 space-y-2">
                    {row.items.map((it) => (
                      <li
                        key={it}
                        className="text-[#666] text-[15px] leading-loose flex items-start gap-2"
                      >
                        <Check size={14} className="mt-1.5 flex-shrink-0 text-[#F5C842]" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
          <div className="border-t border-[#E8E8E8]" />
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <div className="w-full max-w-[440px] h-[440px] md:h-[520px] rounded-[20px] overflow-hidden mx-auto border border-[#E8E8E8] relative">
            <img
              src={WHAT_WE_DO[Math.max(0, active)].image}
              alt={WHAT_WE_DO[Math.max(0, active)].title}
              className="w-full h-full object-cover transition-all duration-500"
            />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="font-display text-white text-[28px] bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 inline-block">
                {WHAT_WE_DO[Math.max(0, active)].title}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Exclusive Hair Services ---------------- */
function ExclusiveHairServices() {
  const [slideIdx, setSlideIdx] = useState(0);
  const totalSlides = Math.ceil(EXCLUSIVE_SERVICES.length / 3);

  const prev = () => setSlideIdx((i) => (i > 0 ? i - 1 : totalSlides - 1));
  const next = () => setSlideIdx((i) => (i < totalSlides - 1 ? i + 1 : 0));

  const visibleServices = EXCLUSIVE_SERVICES.slice(slideIdx * 3, slideIdx * 3 + 3);

  return (
    <section className="bg-[#111] pt-20 pb-24">
      <div className="px-6 md:px-[60px] mb-12 grid lg:grid-cols-2 gap-8 items-end">
        <div>
          <h2 className="font-display font-bold text-white text-[44px] md:text-[56px] leading-[0.95] uppercase">
            EXCLUSIVE HAIR
            <br />
            SERVICE
          </h2>
        </div>
        <div className="flex flex-col justify-between items-start lg:items-end gap-6">
          <p className="text-[#888] text-[15px] leading-[1.7] max-w-[360px] lg:text-right">
            We use only the finest products, carefully selected for their quality and performance.
            From luxurious shampoos to professional-grade treatments, every service is a premium
            experience.
          </p>
          <div className="flex gap-3">
            <button
              onClick={prev}
              className="w-[48px] h-[48px] rounded-full border border-[#F5C842] text-[#F5C842] flex items-center justify-center hover:bg-[#F5C842] hover:text-[#111] transition"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="w-[48px] h-[48px] rounded-full border border-[#F5C842] text-[#F5C842] flex items-center justify-center hover:bg-[#F5C842] hover:text-[#111] transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${slideIdx * 100}%)` }}
        >
          {Array.from({ length: totalSlides }).map((_, slide) => (
            <div key={slide} className="flex w-full flex-shrink-0">
              {EXCLUSIVE_SERVICES.slice(slide * 3, slide * 3 + 3).map((svc) => (
                <div
                  key={svc.name}
                  className="relative group overflow-hidden cursor-pointer flex-shrink-0"
                  style={{ width: "33.33vw", height: 480 }}
                >
                  <img
                    src={svc.image}
                    alt={svc.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 transition-colors duration-300"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-[#F5C842] text-[#111] rounded-full px-5 py-2 text-[13px] font-semibold">
                      Book Now <ArrowRight size={12} className="inline" />
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-[#111] px-6 py-5">
                    <p className="font-display text-white font-bold text-[22px]">{svc.name}</p>
                    <p className="text-[#F5C842] uppercase text-[11px] tracking-[0.2em] mt-1">
                      {svc.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            className="rounded-[3px] transition-all duration-300"
            style={{
              height: 6,
              width: slideIdx === i ? 24 : 8,
              background: slideIdx === i ? "#F5C842" : "#333",
            }}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Salon Discovery ---------------- */
function SalonDiscovery({ onBook }: { onBook: (s: (typeof SALONS)[number]) => void }) {
  const [loc, setLoc] = useState("All Mumbai");
  const [svc, setSvc] = useState("All Services");

  const filtered = useMemo(() => {
    return SALONS.filter((s) => {
      const lOk = loc === "All Mumbai" || s.locality.toLowerCase().includes(loc.toLowerCase());
      const sOk = svc === "All Services" || s.services.includes(svc);
      return lOk && sOk;
    });
  }, [loc, svc]);

  return (
    <section id="discover" className="bg-[#F8F8F8] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-[#111] text-4xl md:text-5xl text-center">
        Discover Salons Near You
      </h2>

      <div className="flex flex-wrap justify-center gap-3 mt-10">
        {LOCALITIES.map((l) => (
          <Pill key={l} active={loc === l} onClick={() => setLoc(l)}>
            {l}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {SERVICES.map((s) => (
          <Pill key={s} active={svc === s} onClick={() => setSvc(s)}>
            {s}
          </Pill>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        {filtered.map((s) => (
          <article
            key={s.id}
            className="bg-white border border-[#E8E8E8] rounded-[20px] overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
          >
            <div className="relative h-[200px]">
              <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
              {s.badge && (
                <span className="absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] bg-[#FFF9E6] text-[#111] border border-[#F5C842]">
                  {s.badge}
                </span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-display text-[#111] font-bold text-[20px]">{s.name}</h3>
              <p className="text-[#666] text-[13px] mt-1 flex items-center gap-1">
                <MapPin size={13} /> {s.locality}
              </p>
              <p className="text-[#111] text-[13px] mt-2 flex items-center gap-1">
                <Star size={13} fill="#F5C842" color="#F5C842" /> {s.rating} · ({s.reviews} reviews)
              </p>
              <p className="text-[#111] text-[14px] mt-1">
                {"\u20B9"}
                {s.priceMin} – {"\u20B9"}
                {s.priceMax}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-[#F8F8F8] text-[#666] border border-[#E8E8E8] rounded-md px-3 py-1 text-[11px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 border border-[#E8E8E8] text-[#333] rounded-full px-4 py-2 text-[13px] hover:border-[#111] transition">
                  View Salon
                </button>
                <button
                  onClick={() => onBook(s)}
                  className="flex-1 bg-[#111] text-white rounded-full px-4 py-2 text-[13px] font-semibold hover:bg-[#F5C842] hover:text-[#111] transition"
                >
                  Book Now
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-[#999] mt-10">No salons match these filters.</p>
      )}
    </section>
  );
}

function Pill({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-[13px] transition ${active ? "border border-[#F5C842] bg-[#FFF9E6] text-[#111]" : "border border-[#E8E8E8] text-[#666] hover:border-[#F5C842]"}`}
    >
      {children}
    </button>
  );
}

/* ---------------- GlamAI ---------------- */
const SCAN_MESSAGES = [
  "Detecting hair porosity...",
  "Measuring moisture levels...",
  "Scanning scalp health...",
  "Generating your report...",
];
const FEATURE_PILLS = [
  { icon: <Scissors size={18} />, l: "Hair Porosity Detection" },
  { icon: <Zap size={18} />, l: "Moisture Level Scan" },
  { icon: <Shield size={18} />, l: "Scalp Health Analysis" },
  { icon: <Sparkles size={18} />, l: "Skin Type Detection" },
  { icon: <Award size={18} />, l: "Treatment Matching" },
];

const BEFORE_AFTER_CARDS = [
  { image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=80" },
  { image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80" },
  { image: "https://images.unsplash.com/photo-1519735777090-ec97162dc266?w=300&q=80" },
];

type ScanResult = {
  condition: string;
  damage_level: number;
  concern_type: "hair" | "skin";
  treatments: string[];
  urgency: "routine" | "important" | "urgent";
  tip: string;
};

function GlamAI() {
  const [state, setState] = useState<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFn = useServerFn(uploadScanImage);
  const analyzeFn = useServerFn(analyzeScan);

  useEffect(() => {
    if (state !== "scanning" && state !== "uploading") return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, [state]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setState("uploading");
      setMsgIdx(0);
      const base64 = dataUrl.split(",")[1] ?? "";
      const mediaType = file.type || "image/jpeg";
      try {
        // Step 1: Upload image to Supabase Storage
        const uploadResult = await uploadFn({ data: { imageBase64: base64, mediaType } });
        setState("scanning");
        // Step 2: Analyze with Anthropic Claude
        const analyzeResult = await analyzeFn({
          data: { scanId: uploadResult.scanId, imageUrl: uploadResult.imageUrl },
        });
        setResult(analyzeResult.result);
        setState("done");
      } catch (e: any) {
        setError(
          e?.message ?? "Could not analyze photo. Please try a clearer image in good lighting.",
        );
        setState("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setState("idle");
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <section id="glamai" className="bg-white">
      <div className="bg-[#F5C842] py-[10px] px-6 md:px-[60px] relative overflow-hidden">
        <p className="text-[#111] text-[13px] font-bold uppercase tracking-[0.15em] text-center">
          <Sparkles size={14} className="inline mr-1.5" /> INTRODUCING GLAMAI — MUMBAI'S FIRST AI
          BEAUTY DIAGNOSIS
        </p>
        <div className="banner-shimmer absolute inset-0 pointer-events-none" />
      </div>

      <div
        className="mx-6 md:mx-[60px] my-8 bg-[#111] rounded-[32px] px-6 md:px-[40px] py-[36px] relative overflow-hidden"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.15)" }}
      >
        <img
          src="https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=1200&q=30"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] blur-[20px] pointer-events-none"
        />

        <div className="text-center max-w-[700px] mx-auto relative z-10">
          <h2 className="font-display font-bold text-[36px] md:text-[48px] leading-[1.1] gold-shimmer-text">
            GlamAI
          </h2>
          <h3 className="font-display text-white text-[22px] md:text-[28px] mt-1">
            Reads Your Hair &amp; Skin.
          </h3>
          <p className="text-[#888] text-[14px] mt-2 max-w-[450px] mx-auto text-center">
            Upload one photo. Get a complete beauty health report and find Mumbai salons that treat
            your exact condition.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-5 relative z-10">
          {FEATURE_PILLS.map((p) => (
            <span
              key={p.l}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-4 py-1.5 text-white text-[12px] flex items-center gap-1.5 hover:border-[#F5C842] transition cursor-default"
            >
              <span className="text-[#F5C842]">{p.icon}</span> {p.l}
            </span>
          ))}
        </div>

        <div className="flex justify-center gap-3 mt-6 relative z-10">
          {BEFORE_AFTER_CARDS.map((c, i) => (
            <div
              key={i}
              className="relative w-[120px] h-[160px] rounded-[14px] overflow-hidden flex-shrink-0"
            >
              <img
                src={c.image}
                alt="Before and after"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.05) 100%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-full bg-white/30" />
              </div>
              <span className="absolute bottom-2 inset-x-0 text-center text-white text-[10px] Inter">
                Before &rarr; After
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-[#888] text-[12px] mt-3 relative z-10">
          See what GlamAI can detect <ArrowRight size={10} className="inline" />
        </p>

        <div className="grid lg:grid-cols-2 gap-5 mt-6 max-w-5xl mx-auto relative z-10">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="rounded-[24px] p-8 md:p-10 min-h-[360px] flex flex-col items-center justify-center text-center transition-colors"
            style={{
              background: "#0D0D0D",
              border: `2px dashed ${dragOver ? "#F5C842" : "#333"}`,
            }}
          >
            {state === "idle" && (
              <>
                <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full pulse-ring"
                    style={{ background: "rgba(245,200,66,0.3)" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full pulse-ring-2"
                    style={{ background: "rgba(245,200,66,0.2)" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full pulse-ring-3"
                    style={{ background: "rgba(245,200,66,0.15)" }}
                  />
                  <span className="relative z-10 text-[#F5C842]">
                    <Camera size={28} />
                  </span>
                </div>
                <h3 className="font-display text-white text-[18px] mt-4">
                  {dragOver ? "Drop it here" : "Upload Your Hair or Skin Photo"}
                </h3>
                <p className="text-[#888] text-[13px] mt-1.5">
                  Clear photo in good lighting gives best results
                </p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 bg-white text-[#111] rounded-full px-6 py-2.5 text-[13px] font-semibold hover:bg-[#F5C842] hover:text-[#111] transition"
                >
                  Choose Photo
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </>
            )}

            {(state === "uploading" || state === "scanning") && preview && (
              <>
                <div className="relative w-[140px] h-[140px]">
                  <img
                    src={preview}
                    alt="upload"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div
                    className="absolute -inset-2 rounded-full spin-ring"
                    style={{ border: "3px solid transparent", borderTopColor: "#F5C842" }}
                  />
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div
                      className="scan-line absolute left-0 right-0 h-[3px]"
                      style={{
                        background: "linear-gradient(90deg, transparent, #F5C842, transparent)",
                      }}
                    />
                  </div>
                </div>
                <p className="text-white text-[14px] mt-4">
                  {state === "uploading" ? "Uploading your photo..." : "GlamAI is analyzing your photo..."}
                </p>
                <p key={msgIdx} className="text-[#888] text-[12px] mt-1.5 fade-up">
                  {SCAN_MESSAGES[msgIdx]}
                </p>
              </>
            )}

            {state === "done" && preview && (
              <>
                <div className="relative">
                  <img
                    src={preview}
                    alt="upload"
                    className="w-[120px] h-[120px] rounded-full object-cover"
                    style={{ border: "3px solid #4ADE80" }}
                  />
                </div>
                <p className="text-[#4ADE80] text-[13px] mt-3 flex items-center gap-1">
                  <Check size={14} /> Analysis Complete
                </p>
                <button
                  onClick={reset}
                  className="mt-3 text-[#888] text-[12px] hover:text-white transition"
                >
                  Scan another photo
                </button>
              </>
            )}

            {state === "error" && (
              <>
                <span className="text-4xl text-[#888]">
                  <Camera size={36} />
                </span>
                <p className="text-white text-[14px] mt-3">{error}</p>
                <button
                  onClick={reset}
                  className="mt-4 bg-white text-[#111] rounded-full px-5 py-2 text-[13px] font-semibold"
                >
                  Try Again
                </button>
              </>
            )}
          </div>

          <div className="min-h-[360px]">
            {state === "idle" || state === "error" ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-[#F5C842]">
                  <Sparkles size={32} />
                </span>
                <h3 className="font-display text-white text-[20px] mt-3">
                  Your GlamAI Report Will Appear Here
                </h3>
                <p className="text-[#888] text-[13px] mt-1.5 max-w-sm">
                  Upload a photo to get your personalized beauty diagnosis
                </p>
                <div className="w-full max-w-sm mt-5 space-y-2 blur-sm select-none">
                  {[
                    "Hair Porosity: ██████ ?/10",
                    "Moisture Level: ████ ?/10",
                    "Damage Score: ████████ ?/10",
                  ].map((t) => (
                    <div
                      key={t}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#666] text-[12px]"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : state === "uploading" || state === "scanning" ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative h-20 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              result && <ResultsView r={result} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultsView({ r }: { r: ScanResult }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((Math.max(0, Math.min(5, r.damage_level)) / 5) * 100), 80);
    return () => clearTimeout(t);
  }, [r]);
  const damageColor = r.damage_level <= 3 ? "#F5C842" : "#EF4444";
  const urgencyColor =
    r.urgency === "routine" ? "#4ADE80" : r.urgency === "important" ? "#F5C842" : "#EF4444";
  return (
    <div className="space-y-3 fade-up">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-4">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ background: "#F5C84222", color: "#F5C842", border: "1px solid #F5C842" }}
          >
            {r.concern_type}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
            style={{
              background: urgencyColor + "22",
              color: urgencyColor,
              border: `1px solid ${urgencyColor}`,
            }}
          >
            {r.urgency}
          </span>
        </div>
        <h3 className="font-display text-white text-[18px] font-bold mt-2">{r.condition}</h3>
        <div className="mt-3">
          <div className="flex justify-between text-[12px] text-[#888]">
            <span>Damage Level</span>
            <span className="text-white">{r.damage_level}/5</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{ width: `${w}%`, background: damageColor }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-4">
        <p className="text-white text-[13px] font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#F5C842]" /> Recommended Treatments
        </p>
        <div className="flex flex-wrap gap-1.5">
          {r.treatments.map((t, i) => (
            <span
              key={i}
              className="bg-[#F5C842] text-[#111] font-semibold rounded-full px-3 py-1 text-[12px]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-4">
        <p className="text-[#F5C842] text-[13px] font-semibold mb-1 flex items-center gap-1.5">
          <Zap size={12} /> GlamAI Pro Tip
        </p>
        <p className="text-white text-[13px] italic">{r.tip}</p>
      </div>

      <div className="rounded-[16px] p-4 bg-[#1A1A1A] border border-[#F5C842]/30">
        <h4 className="font-display text-white text-[16px]">
          3 Mumbai Salons Treat This Condition
        </h4>
        <p className="text-[#ddd] text-[12px] mt-0.5">
          Based on your diagnosis, these salons specialize in {r.treatments[0]}
        </p>
        <a
          href="#discover"
          className="inline-block mt-2.5 bg-[#F5C842] text-[#111] rounded-full px-5 py-2 text-[13px] font-bold hover:bg-[#e0b635] transition"
        >
          Find Matched Salons <ArrowRight size={12} className="inline" />
        </a>
      </div>
    </div>
  );
}

/* ---------------- Team ---------------- */
function Team() {
  return (
    <section id="team" className="bg-[#111] py-24">
      <div className="grid lg:grid-cols-2 gap-8 px-6 md:px-[60px] mb-12">
        <div>
          <h2 className="font-display font-bold text-white text-4xl md:text-[56px] leading-none">
            OUR CREATIVE
          </h2>
          <h2 className="font-display font-bold italic text-white text-4xl md:text-[56px] leading-none">
            TEAM &amp; WORK
          </h2>
        </div>
        <div className="lg:text-right flex flex-col lg:items-end justify-center gap-4">
          <p className="text-[#888] text-[16px] max-w-[320px]">
            We work with only the finest Mumbai stylists, carefully selected for their skill and
            artistry.
          </p>
          <button className="border border-white text-white rounded-full px-6 py-3 text-[14px] hover:bg-white hover:text-[#111] transition w-fit">
            View all stylists <ArrowRight size={14} className="inline ml-1" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex px-6 md:px-[60px]" style={{ width: "max-content" }}>
          {STYLISTS.map((s, i) => (
            <div
              key={s.name}
              className="group relative flex-shrink-0 w-[240px] sm:w-[260px] h-[440px] overflow-hidden cursor-pointer"
            >
              <img
                src={s.image}
                alt={s.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(transparent 30%, rgba(0,0,0,0.85))" }}
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              <div className="absolute inset-x-0 bottom-0 p-5 translate-y-4 group-hover:translate-y-0 transition-transform duration-400">
                <p className="font-display text-white font-bold text-[22px] sm:text-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  {s.name}
                </p>
                <span className="inline-block mt-2 rounded-full px-3 py-1 text-[11px] bg-[rgba(245,200,66,0.2)] text-[#F5C842] opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  {s.role}
                </span>
                <p className="text-[#bbb] text-[12px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  {s.exp} · {s.loc}
                </p>
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  {[
                    <Instagram size={14} />,
                    <Twitter size={14} />,
                    <Youtube size={14} />,
                    <Facebook size={14} />,
                  ].map((ic, j) => (
                    <span
                      key={j}
                      className="w-8 h-8 rounded-full border border-white/60 text-white flex items-center justify-center"
                    >
                      {ic}
                    </span>
                  ))}
                </div>
                <button className="mt-3 bg-white text-[#111] rounded-full px-4 py-2 text-[13px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                  Book This Stylist <ArrowRight size={12} className="inline" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 360 Tour ---------------- */
function Tour360() {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [pan, setPan] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const cur = TOUR_SALONS[idx];

  return (
    <section className="bg-[#FFF5F8] text-[#111] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-center text-[#111] text-4xl md:text-5xl">
        Step Inside Before You Book
      </h2>
      <p className="text-center text-[#666] text-[16px] mt-3">
        Explore salon interiors with our immersive 360 virtual tour
      </p>

      <div
        ref={viewerRef}
        className="relative w-full h-[460px] rounded-3xl overflow-hidden mt-12 select-none"
        style={{ cursor: drag ? "grabbing" : "grab" }}
        onMouseDown={(e) => {
          setDrag(true);
          startX.current = e.clientX;
        }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
        onMouseMove={(e) => {
          if (drag && viewerRef.current) {
            const rect = viewerRef.current.getBoundingClientRect();
            const offsetX = (e.clientX - startX.current) * 0.15;
            setPan(offsetX);
          }
        }}
      >
        <img
          src={cur.image}
          alt={cur.name}
          className="absolute inset-0 w-[110%] h-full object-cover transition-none"
          style={{
            transform: `translateX(${pan}px)`,
            backgroundPosition: `${50 + pan / 4}% 50%`,
          }}
          draggable={false}
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/30 font-display" style={{ fontSize: 200 }}>
            360
          </span>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <RotateCw size={56} className="text-white" />
          <span className="text-white text-[12px] tracking-[0.3em] mt-2 uppercase">
            {drag ? "Exploring..." : "Drag to Explore"}
          </span>
        </div>
        <div className="absolute bottom-6 left-6 pointer-events-none">
          <p className="font-display text-white text-2xl">
            {cur.name}, {cur.loc}
          </p>
          <p className="text-[#bbb] text-[13px] mt-1">Click and drag to look around</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {TOUR_SALONS.map((t, i) => (
          <button
            key={t.name}
            onClick={() => {
              setIdx(i);
              setPan(0);
            }}
            className="relative rounded-xl overflow-hidden transition-all"
            style={{
              width: 200,
              height: 110,
              border: `3px solid ${idx === i ? "#F5C842" : "transparent"}`,
            }}
          >
            <img
              src={t.image}
              alt={t.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-left">
              <p className="font-display text-white text-[14px] leading-tight">{t.name}</p>
              <p className="text-[#bbb] text-[11px]">{t.loc}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials() {
  return (
    <section className="bg-white text-[#111] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-center text-[#111] text-4xl md:text-5xl">
        Mumbai Trusts GlamSpot
      </h2>
      <p className="text-center text-[#666] text-[16px] mt-2">Real stories from real clients</p>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="bg-[#F8F8F8] rounded-[24px] p-8">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} fill="#F5C842" color="#F5C842" />
              ))}
            </div>
            <p className="text-[#333] text-[16px] italic leading-[1.7] mt-4">"{t.quote}"</p>
            <div className="flex items-center gap-3 mt-6">
              <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-[#111] text-[15px]">{t.name}</p>
                <p className="text-[#999] text-[13px]">{t.loc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Brands ---------------- */
function Brands() {
  return (
    <section className="bg-[#F8F8F8] py-16">
      <h3 className="font-display text-[#111] text-3xl md:text-[36px] text-center mb-10">
        Trusted Products. Premium Salons.
      </h3>
      <div className="overflow-hidden">
        <div className="flex gap-4 w-max scroll-brands">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span
              key={i}
              className="bg-white border border-[#E8E8E8] rounded-full px-7 py-3 text-[#333] text-[14px] whitespace-nowrap flex-shrink-0 hover:border-[#F5C842] transition"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  const cols = [
    { title: "Discover", items: ["Browse Salons", "By Locality", "By Service", "Top Rated"] },
    { title: "Company", items: ["About Us", "Careers", "Press", "Blog"] },
    { title: "Support", items: ["Help Center", "Contact", "Privacy Policy", "Terms"] },
    { title: "Cities", items: ["Mumbai", "Bangalore", "Delhi", "Pune", "Hyderabad"] },
  ];
  return (
    <footer className="bg-[#111] border-t border-[#333] px-6 md:px-[60px] py-20">
      <div className="flex flex-wrap justify-between items-start gap-8">
        <div>
          <p className="font-display text-white text-[28px]">GlamSpot</p>
          <p className="text-[#888] text-[14px] mt-1">Mumbai's Beauty OS</p>
        </div>
        <div className="flex gap-3">
          {[<Instagram size={14} />, <Twitter size={14} />, <Youtube size={14} />].map((ic, i) => (
            <span
              key={i}
              className="w-10 h-10 rounded-full border border-white/40 text-white flex items-center justify-center hover:border-[#F5C842] hover:text-[#F5C842] transition cursor-pointer"
            >
              {ic}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-white font-semibold text-[14px] mb-4">{c.title}</p>
            <ul className="space-y-2">
              {c.items.map((it) => (
                <li key={it}>
                  <a href="#" className="text-[#888] text-[14px] hover:text-[#F5C842] transition">
                    {it}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-[#333] flex flex-wrap justify-between gap-2 text-[#888] text-[13px]">
        <p>
          &copy; 2026 GlamSpot. Built with <Sparkles size={12} className="inline" /> at SuperXgen AI
          Buildathon
        </p>
        <p>Powered by AI &middot; React &middot; TanStack</p>
      </div>
    </footer>
  );
}

/* ---------------- Booking Modal ---------------- */
const BOOKING_SERVICES = [
  "Haircut",
  "Hair Color",
  "Keratin",
  "Facial",
  "Bridal Makeup",
  "Nail Art",
  "Men's Grooming",
  "Hair Spa",
];
const BOOKING_STYLISTS = [
  { name: "Priya S.", spec: "Hair Artist", rating: 4.9 },
  { name: "Rohan M.", spec: "Colorist", rating: 4.8 },
  { name: "Meera S.", spec: "Bridal Expert", rating: 5.0 },
];
const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];
const BOOKED_SLOTS = new Set(["12:00 PM", "4:00 PM"]);

function BookingModal({
  salon,
  onClose,
}: {
  salon?: (typeof SALONS)[number];
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<string[]>([]);
  const [stylist, setStylist] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const days = useMemo(() => {
    const arr: { label: string; sub: string; key: string }[] = [];
    const d = new Date();
    const dnames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const nd = new Date(d);
      nd.setDate(d.getDate() + i);
      arr.push({
        label: i === 0 ? "Today" : dnames[nd.getDay()],
        sub: String(nd.getDate()),
        key: nd.toISOString().slice(0, 10),
      });
    }
    return arr;
  }, []);

  const canNext =
    step === 0
      ? services.length > 0
      : step === 1
        ? !!stylist
        : step === 2
          ? !!date && !!time
          : true;
  const labels = ["Service", "Stylist", "Date & Time", "Confirm"];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="modal-in bg-white rounded-[28px] max-w-[520px] w-full p-8 md:p-10 max-h-[90vh] overflow-y-auto relative"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#333] hover:text-[#111] transition"
        >
          <X size={20} />
        </button>

        {!done ? (
          <>
            <h3 className="font-display text-[#111] text-[26px] md:text-[28px]">
              Book Your Appointment
            </h3>
            <p className="text-[#999] italic text-[14px] mt-1">
              {salon?.name ?? "Mumbai's finest salons"}
            </p>

            <div className="flex items-center gap-2 mt-6">
              {labels.map((l, i) => (
                <div key={l} className="flex-1 flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                        i < step
                          ? "bg-[#F5C842] text-[#111]"
                          : i === step
                            ? "bg-[#111] text-white"
                            : "border border-[#E8E8E8] text-[#999]"
                      }`}
                    >
                      {i < step ? <Check size={12} /> : i + 1}
                    </div>
                    <span className="text-[10px] text-[#999]">{l}</span>
                  </div>
                  {i < labels.length - 1 && <div className="flex-1 h-px bg-[#E8E8E8] -mt-4" />}
                </div>
              ))}
            </div>

            <div className="mt-8">
              {step === 0 && (
                <>
                  <p className="text-[#111] text-[16px] font-semibold mb-4">What would you like?</p>
                  <div className="flex flex-wrap gap-2">
                    {BOOKING_SERVICES.map((s) => {
                      const on = services.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setServices((arr) => (on ? arr.filter((x) => x !== s) : [...arr, s]))
                          }
                          className={`rounded-full px-4 py-2 text-[13px] transition ${on ? "bg-[#111] text-white border border-[#111]" : "border border-[#E8E8E8] text-[#333] hover:border-[#111]"}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <p className="text-[#111] text-[16px] font-semibold mb-4">Pick your stylist</p>
                  <div className="grid grid-cols-3 gap-3">
                    {BOOKING_STYLISTS.map((s) => {
                      const on = stylist === s.name;
                      return (
                        <button
                          key={s.name}
                          onClick={() => setStylist(s.name)}
                          className={`bg-[#F8F8F8] rounded-2xl p-4 text-center transition ${on ? "border-[#F5C842] border-2" : "border border-[#E8E8E8]"}`}
                        >
                          <User size={24} className="mx-auto text-[#666]" />
                          <p className="text-[#111] text-[13px] font-semibold mt-2">{s.name}</p>
                          <p className="text-[#999] text-[11px]">{s.spec}</p>
                          <p className="text-[#F5C842] text-[11px] mt-1 flex items-center justify-center gap-0.5">
                            <Star size={10} fill="#F5C842" color="#F5C842" /> {s.rating}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-[#111] text-[16px] font-semibold mb-4">Pick date &amp; time</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {days.map((d) => {
                      const on = date === d.key;
                      return (
                        <button
                          key={d.key}
                          onClick={() => setDate(d.key)}
                          className={`flex-shrink-0 rounded-xl border px-3 py-2 text-center transition ${on ? "bg-[#111] text-white border-[#111]" : "border-[#E8E8E8] text-[#333] bg-[#F8F8F8]"}`}
                        >
                          <p className="text-[11px]">{d.label}</p>
                          <p className="text-[16px] font-semibold">{d.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {TIME_SLOTS.map((t) => {
                      const booked = BOOKED_SLOTS.has(t);
                      const on = time === t;
                      return (
                        <button
                          key={t}
                          disabled={booked}
                          onClick={() => setTime(t)}
                          className={`rounded-xl p-3 text-[12px] border transition ${
                            booked
                              ? "bg-[#F8F8F8] text-[#ccc] border-[#E8E8E8] cursor-not-allowed"
                              : on
                                ? "bg-[#111] text-white border-[#111]"
                                : "border-[#E8E8E8] text-[#333] bg-[#F8F8F8] hover:border-[#111]"
                          }`}
                        >
                          {booked ? "Booked" : t}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-2xl p-6">
                    {[
                      ["Salon", salon?.name ?? "GlamSpot Partner"],
                      ["Services", services.join(", ") || "—"],
                      ["Stylist", stylist ?? "—"],
                      ["Date", date ?? "—"],
                      ["Time", time ?? "—"],
                      ["Price", salon ? `₹${salon.priceMin} – ₹${salon.priceMax}` : "₹500 – ₹2000"],
                    ].map(([k, v], i) => (
                      <div
                        key={k as string}
                        className={`flex justify-between py-3 ${i > 0 ? "border-t border-[#E8E8E8]" : ""}`}
                      >
                        <span className="text-[#999] text-[13px]">{k}</span>
                        <span className="text-[#111] text-[14px] text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setDone(true)}
                    className="w-full bg-[#111] text-white rounded-full py-4 font-bold text-[15px] mt-6 hover:bg-[#333] transition"
                  >
                    Confirm Booking
                  </button>
                </>
              )}
            </div>

            {step < 3 && (
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="border border-[#E8E8E8] text-[#333] rounded-full px-6 py-3 disabled:opacity-30"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="bg-[#111] text-white rounded-full px-6 py-3 font-semibold disabled:opacity-40"
                >
                  Next <ArrowRight size={14} className="inline" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#FFF9E6] border border-[#F5C842] mx-auto flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <path
                  className="draw-check"
                  d="M10 21 L18 29 L31 13"
                  fill="none"
                  stroke="#F5C842"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-display text-[#111] text-[28px] mt-6">Booking Confirmed!</h3>
            <p className="text-[#999] text-[14px] mt-2">
              See you at {salon?.name ?? "your salon"} on {date ?? "the chosen day"} at{" "}
              {time ?? "your slot"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button className="border border-[#E8E8E8] text-[#333] rounded-full px-5 py-2.5 flex items-center gap-1.5">
                <Calendar size={14} /> Add to Calendar
              </button>
              <button
                onClick={onClose}
                className="border border-[#E8E8E8] text-[#333] rounded-full px-5 py-2.5 flex items-center gap-1.5"
              >
                <Bookmark size={14} /> View Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
