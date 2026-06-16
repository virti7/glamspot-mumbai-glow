import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzePhoto } from "@/lib/glamai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GlamSpot — Mumbai's #1 Salon Platform" },
      { name: "description", content: "Discover, compare and book Mumbai's finest salons. Get an AI hair & skin diagnosis with GlamAI." },
      { property: "og:title", content: "GlamSpot — Mumbai's Beauty OS" },
      { property: "og:description", content: "Skip the Instagram DMs. Find, compare and book top salons near you — powered by AI." },
    ],
  }),
  component: Index,
});

/* ---------------- Data ---------------- */
const SALONS = [
  { id: 1, name: "Mirrors Salon & Spa", locality: "Bandra West", services: ["Hair", "Bridal", "Skin"], rating: 4.9, reviews: 124, priceMin: 500, priceMax: 2000, tags: ["Keratin", "Bridal", "Color"], badge: "💫 Celeb Stylist", gradient: "linear-gradient(135deg,#1a0a0a,#4a1515)", emoji: "✂️" },
  { id: 2, name: "The Gloss Studio", locality: "Juhu", services: ["Hair", "Skin"], rating: 4.7, reviews: 89, priceMin: 800, priceMax: 3500, tags: ["Balayage", "Color", "Facial"], badge: null, gradient: "linear-gradient(135deg,#0a0a2a,#151560)", emoji: "💇" },
  { id: 3, name: "Luxe Locks", locality: "Andheri West", services: ["Hair", "Men's Grooming"], rating: 4.8, reviews: 203, priceMin: 400, priceMax: 1800, tags: ["Hair Spa", "Men's", "Keratin"], badge: null, gradient: "linear-gradient(135deg,#0a1a0a,#154030)", emoji: "🧔" },
  { id: 4, name: "Trim & Glow", locality: "Powai", services: ["Skin", "Nails"], rating: 4.6, reviews: 67, priceMin: 300, priceMax: 1200, tags: ["Facials", "Nails", "Waxing"], badge: null, gradient: "linear-gradient(135deg,#1a0a1a,#401540)", emoji: "💅" },
  { id: 5, name: "Studio Noir", locality: "Colaba", services: ["Bridal", "Hair", "Skin"], rating: 4.9, reviews: 312, priceMin: 1200, priceMax: 6000, tags: ["Bridal", "Premium", "Color"], badge: "💫 Celeb Stylist", gradient: "linear-gradient(135deg,#0a0a0a,#303030)", emoji: "👰" },
  { id: 6, name: "BeautyBox", locality: "Kurla", services: ["Nails", "Skin"], rating: 4.5, reviews: 45, priceMin: 200, priceMax: 900, tags: ["Nails", "Waxing", "Facial"], badge: null, gradient: "linear-gradient(135deg,#1a1000,#4a3000)", emoji: "🧖" },
];

const LOCALITIES = ["All Mumbai", "Bandra", "Andheri", "Juhu", "Powai", "Colaba", "Kurla"];
const SERVICES = ["All Services", "Hair", "Skin", "Bridal", "Nails", "Men's Grooming"];

const REEL_ROW_1 = [
  { svc: "Hair Color Transformation", salon: "Mirrors Salon", emoji: "✂️", g: "linear-gradient(160deg,#2a0a0a,#5c1515)", likes: "12.4k", c: 342 },
  { svc: "Bridal Makeup", salon: "Luxe Looks Bandra", emoji: "👰", g: "linear-gradient(160deg,#1a0a1a,#5c1545)", likes: "9.1k", c: 211 },
  { svc: "Keratin Treatment", salon: "The Gloss Studio", emoji: "💆", g: "linear-gradient(160deg,#0a0a2a,#151555)", likes: "7.8k", c: 187 },
  { svc: "Nail Art Design", salon: "Studio Noir", emoji: "💅", g: "linear-gradient(160deg,#1a0a0a,#451515)", likes: "5.3k", c: 122 },
  { svc: "Men's Fade Cut", salon: "BeautyBox Kurla", emoji: "🧔", g: "linear-gradient(160deg,#0a1a0a,#155515)", likes: "4.9k", c: 98 },
  { svc: "Balayage", salon: "Bandra Blowout Bar", emoji: "💇", g: "linear-gradient(160deg,#2a1500,#5c3000)", likes: "8.2k", c: 215 },
  { svc: "Facial Glow", salon: "Juhu Glow Studio", emoji: "🌟", g: "linear-gradient(160deg,#0a1a2a,#155560)", likes: "6.6k", c: 154 },
  { svc: "Hair Spa", salon: "Trim & Glow Powai", emoji: "🧖", g: "linear-gradient(160deg,#1a0a2a,#451555)", likes: "3.7k", c: 88 },
  { svc: "Mehendi Art", salon: "Shringar Studio", emoji: "🌿", g: "linear-gradient(160deg,#1a2a0a,#455515)", likes: "5.1k", c: 132 },
  { svc: "Extensions", salon: "Velvet Chair Mumbai", emoji: "💇", g: "linear-gradient(160deg,#2a0a1a,#5c1545)", likes: "4.2k", c: 109 },
];
const REEL_ROW_2 = [
  { svc: "Pre-Bridal Glow", salon: "Mirrors Salon", emoji: "✨", g: "linear-gradient(160deg,#2a0a1a,#5c1535)", likes: "10.1k", c: 287 },
  { svc: "Smokey Eye Tutorial", salon: "Studio Noir", emoji: "💄", g: "linear-gradient(160deg,#0a0a1a,#252550)", likes: "8.9k", c: 234 },
  { svc: "Curly Hair Care", salon: "Luxe Locks", emoji: "💆", g: "linear-gradient(160deg,#1a1000,#553500)", likes: "6.2k", c: 167 },
  { svc: "Chrome Nails", salon: "BeautyBox", emoji: "💅", g: "linear-gradient(160deg,#0a1a1a,#155555)", likes: "7.4k", c: 198 },
  { svc: "Beard Sculpting", salon: "Andheri Barbers", emoji: "🧔", g: "linear-gradient(160deg,#1a0a0a,#552020)", likes: "4.4k", c: 102 },
  { svc: "Hydra Facial", salon: "The Gloss Studio", emoji: "💧", g: "linear-gradient(160deg,#0a1a2a,#155570)", likes: "9.8k", c: 256 },
  { svc: "Saree Draping", salon: "Shringar Studio", emoji: "👗", g: "linear-gradient(160deg,#2a0a0a,#601515)", likes: "5.8k", c: 143 },
  { svc: "Color Correction", salon: "Bandra Blowout", emoji: "🎨", g: "linear-gradient(160deg,#1a0a2a,#451560)", likes: "6.9k", c: 175 },
  { svc: "Glass Skin Facial", salon: "Juhu Glow", emoji: "🌟", g: "linear-gradient(160deg,#0a2a1a,#155540)", likes: "11.2k", c: 312 },
  { svc: "Wedding Updo", salon: "Velvet Chair", emoji: "👰", g: "linear-gradient(160deg,#2a0a2a,#601560)", likes: "8.5k", c: 224 },
];

const WHAT_WE_DO = [
  { title: "Hair", emoji: "✂️", items: ["Women's & Men's Cuts & Styling", "Highlights, Balayage, Ombre & Color", "Keratin & Smoothening Treatments", "Hair Spa & Deep Conditioning Masks"], grad: "linear-gradient(135deg,#1a0808,#5c2020)" },
  { title: "Skin", emoji: "🧖", items: ["Hydrafacials & Deep Cleanups", "Tan Removal & Skin Brightening", "Anti-Acne & Scar Treatments", "Bridal Pre-Glow Packages"], grad: "linear-gradient(135deg,#081a1a,#205c5c)" },
  { title: "Bridal", emoji: "👰", items: ["Full Bridal Makeup & Draping", "Pre-Bridal Packages (6 Sessions)", "Mehendi & Jewellery Styling", "Trial Makeup Sessions"], grad: "linear-gradient(135deg,#1a0812,#5c204a)" },
  { title: "Nails", emoji: "💅", items: ["Gel & Acrylic Extensions", "Nail Art, Chrome & Ombre Finish", "Classic Manicure & Pedicure", "Nail Repair & Strengthening"], grad: "linear-gradient(135deg,#08081a,#20205c)" },
];

const STYLISTS = [
  { name: "Priya Sharma", role: "Hair Artist", exp: "8 years exp", loc: "Bandra", emoji: "💇", g: "linear-gradient(180deg,#1a1a1a,#0d0d0d)" },
  { name: "Rohan Mehta", role: "Master Colorist", exp: "12 years", loc: "Juhu", emoji: "✂️", g: "linear-gradient(180deg,#1a1000,#0d0a00)" },
  { name: "Aisha Khan", role: "Barber & Groomer", exp: "6 years", loc: "Andheri", emoji: "🧔", g: "linear-gradient(180deg,#0d0d1a,#000010)" },
  { name: "Divya Patel", role: "Nail Technician", exp: "5 years", loc: "Powai", emoji: "💅", g: "linear-gradient(180deg,#1a0d0d,#100000)" },
  { name: "Meera Sinha", role: "Bridal Expert", exp: "10 years", loc: "Colaba", emoji: "👰", g: "linear-gradient(180deg,#0d1a0d,#001000)" },
];

const TESTIMONIALS = [
  { quote: "Finally found my Bandra go-to without scrolling Instagram for hours! The GlamAI diagnosis was spot on — keratin treatment completely transformed my hair.", name: "Priya M.", loc: "Bandra", init: "PM", g: "linear-gradient(135deg,#6B2737,#D4AF37)" },
  { quote: "Booked my bridal package through GlamSpot 2 weeks before my wedding. Studio Noir was incredible. No DMs, no waiting — confirmed in 30 seconds.", name: "Sneha K.", loc: "Andheri", init: "SK", g: "linear-gradient(135deg,#1a0a2a,#6B2737)" },
  { quote: "GlamAI detected heat damage I didn't even know I had. Got a protein treatment done and couldn't believe the difference. This is genius.", name: "Rahul D.", loc: "Powai", init: "RD", g: "linear-gradient(135deg,#0a1a2a,#4ADE80)" },
];

const BRANDS = ["L'Oréal Professional", "Schwarzkopf", "Wella", "Kérastase", "OPI", "Dermalogica", "TIGI", "Redken", "Mamaearth Pro", "BBlunt", "Streax Pro"];

/* ---------------- Page ---------------- */
function Index() {
  const [booking, setBooking] = useState<{ open: boolean; salon?: typeof SALONS[number] }>({ open: false });
  const openBooking = (s?: typeof SALONS[number]) => setBooking({ open: true, salon: s });
  const closeBooking = () => setBooking({ open: false });

  return (
    <div className="font-body bg-[#0D0D0D] text-white">
      <Navbar onBook={() => openBooking(SALONS[0])} />
      <Hero onBook={() => openBooking()} />
      <ReelsStrip />
      <WhatWeDo />
      <SalonDiscovery onBook={openBooking} />
      <GlamAI />
      <Team />
      <Tour360 />
      <Testimonials />
      <Brands />
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
        scrolled ? "bg-[#0D0D0D]/85 backdrop-blur-xl border-[#222]" : "bg-transparent border-transparent"
      }`}
    >
      <div className="flex items-center justify-between px-6 md:px-[60px] py-5">
        <a href="#top" className="font-display font-bold text-white text-2xl tracking-tight">GlamSpot</a>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.l} href={l.h} className="text-white/90 hover:text-white text-[14px] transition">{l.l}</a>
          ))}
          <button onClick={onBook} className="text-white/90 hover:text-white text-[14px] transition">Book Now</button>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <span className="border border-white/40 rounded-full px-4 py-2 text-[13px]">📍 Mumbai ▾</span>
          <button className="bg-white text-black rounded-full px-5 py-2 text-[13px] font-semibold hover:bg-white/90 transition">Sign In</button>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="md:hidden text-white text-2xl">{open ? "✕" : "☰"}</button>
      </div>
      {open && (
        <div className="md:hidden bg-[#0D0D0D] border-t border-[#222] px-6 py-6 space-y-4">
          {links.map((l) => (
            <a key={l.l} href={l.h} onClick={() => setOpen(false)} className="block text-white text-base">{l.l}</a>
          ))}
          <button onClick={() => { setOpen(false); onBook(); }} className="block text-white text-base">Book Now</button>
          <button className="w-full bg-white text-black rounded-full py-3 font-semibold">Sign In</button>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ onBook }: { onBook: () => void }) {
  const cards = [
    { loc: "● BANDRA", name: "Mirrors Salon", svc: "Hair · Bridal", emoji: "✂️", g: "linear-gradient(160deg,#1a0a0a,#3d1515)" },
    { loc: "● JUHU", name: "The Gloss Studio", svc: "Balayage", emoji: "💇", g: "linear-gradient(160deg,#0a0a1a,#151540)" },
    { loc: "● ANDHERI", name: "Luxe Locks", svc: "Color · Spa", emoji: "✨", g: "linear-gradient(160deg,#0a1a0a,#154015)" },
  ];
  return (
    <section id="top" className="relative min-h-screen bg-[#0D0D0D] pt-28 pb-20 px-6 md:px-[60px] overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
        <div className="fade-up">
          <p className="text-[#888] uppercase text-[11px] tracking-[0.2em]">Mumbai's #1 Salon Platform</p>
          <h1 className="font-display font-bold text-[44px] sm:text-[56px] lg:text-[72px] leading-[1.05] mt-5">
            <span className="text-white block">Mumbai's Most</span>
            <span className="text-white block">Beautiful Salons.</span>
            <span className="text-[#555] block">Discovered</span>
            <span className="text-[#555] block">Instantly.</span>
          </h1>
          <p className="text-[#888] text-[16px] max-w-[420px] mt-6 leading-relaxed">
            Skip the Instagram DMs. Find, compare and book top salons near you — powered by AI.
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <a href="#discover" className="bg-white text-black rounded-full px-8 py-4 font-semibold text-[14px] hover:scale-105 transition">Explore Salons →</a>
            <a href="#glamai" className="bg-transparent text-white border border-white rounded-full px-8 py-4 font-semibold text-[14px] hover:bg-white hover:text-black transition">✦ Try GlamAI — Scan Your Hair</a>
          </div>
          <button onClick={onBook} className="sr-only">hidden book</button>
        </div>

        <div className="relative h-[420px] sm:h-[500px] flex items-center justify-center">
          {cards.map((c, i) => (
            <div
              key={i}
              className={`absolute rounded-3xl overflow-hidden ${i === 0 ? "glam-float1 z-10 w-[200px] h-[280px] sm:w-[220px] sm:h-[300px] opacity-80" : i === 1 ? "glam-float2 z-30 w-[240px] h-[320px] sm:w-[260px] sm:h-[340px]" : "glam-float3 z-20 w-[200px] h-[280px] sm:w-[220px] sm:h-[300px] opacity-80"}`}
              style={{ background: c.g, boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}
            >
              <span className="absolute top-3 left-3 bg-black/60 rounded-full px-3 py-1 text-[11px] flex items-center gap-1.5">
                <span className="text-[#4ADE80]">●</span>
                <span className="text-white">{c.loc.replace("● ", "")}</span>
              </span>
              <div className="absolute inset-0 flex items-center justify-center text-[3rem]">{c.emoji}</div>
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                <p className="font-display text-white text-[18px]">{c.name}</p>
                <p className="text-[#aaa] text-[13px]">{c.svc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-6 inset-x-0 text-center text-[#666] text-[12px] tracking-widest uppercase bounce-y">↓ scroll to explore</div>
    </section>
  );
}

/* ---------------- Reels Strip ---------------- */
function ReelsStrip() {
  return (
    <section className="bg-[#111] py-16">
      <div className="text-center px-6">
        <h2 className="font-display text-white text-3xl md:text-[36px] mb-3">What's Happening in Mumbai Salons</h2>
        <p className="text-[#888] text-[15px]">Live from the chair.</p>
      </div>

      <div className="mt-10 overflow-hidden">
        <div className="flex gap-4 w-max scroll-left">
          {[...REEL_ROW_1, ...REEL_ROW_1].map((r, i) => <ReelCard key={`a${i}`} r={r} live />)}
        </div>
      </div>
      <div className="mt-4 overflow-hidden">
        <div className="flex gap-4 w-max scroll-right">
          {[...REEL_ROW_2, ...REEL_ROW_2].map((r, i) => <ReelCard key={`b${i}`} r={r} />)}
        </div>
      </div>
    </section>
  );
}

function ReelCard({ r, live }: { r: any; live?: boolean }) {
  return (
    <div
      className="relative group rounded-[20px] overflow-hidden flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-[1.05]"
      style={{ width: 160, height: 290, background: r.g }}
    >
      <span className={`absolute top-2.5 left-2.5 z-10 rounded-full px-2.5 py-1 text-[10px] flex items-center gap-1 ${live ? "bg-black/70 text-white" : "bg-white/15 text-white"}`}>
        {live ? <><span className="text-red-500">●</span> LIVE</> : <>✦ REEL</>}
      </span>
      <div className="absolute inset-0 flex items-center justify-center text-[2.5rem]">{r.emoji}</div>
      <div className="absolute right-2 bottom-16 flex flex-col gap-3 text-white text-[11px] items-center">
        <span>❤️<br />{r.likes}</span>
        <span>💬<br />{r.c}</span>
        <span>↗️</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <p className="font-display text-white text-[14px] leading-tight">{r.svc}</p>
        <p className="text-[#bbb] text-[11px] mt-0.5">{r.salon}</p>
      </div>
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
        <span className="bg-white text-black rounded-full px-3 py-1.5 text-[11px] font-semibold">Book This Look →</span>
      </div>
    </div>
  );
}

/* ---------------- What We Do ---------------- */
function WhatWeDo() {
  const [active, setActive] = useState(0);
  return (
    <section id="what-we-do" className="bg-[#F5F5F5] text-[#111] py-24 px-6 md:px-[60px]">
      <div className="grid lg:grid-cols-2 gap-10 mb-12">
        <h2 className="font-display font-bold text-[#111] text-4xl md:text-[52px] leading-tight flex items-center">
          What We Do
          <span className="inline-block w-[2px] h-12 bg-[#6B2737] ml-4 align-middle" />
        </h2>
        <p className="text-[#666] text-[16px] max-w-[400px] self-center">
          GlamSpot connects you to Mumbai's finest salons. Whether it's a quick trim or a full bridal transformation, we bring the city's best to your fingertips.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          {WHAT_WE_DO.map((row, i) => {
            const open = active === i;
            return (
              <div key={row.title} className="border-t border-[#DDD] py-7">
                <button onClick={() => setActive(open ? -1 : i)} className="w-full flex items-center justify-between text-left">
                  <span className="font-display font-bold text-[#111] text-[24px] md:text-[28px]">{row.title} {row.emoji}</span>
                  <span className={`w-8 h-8 rounded-full border border-[#111] flex items-center justify-center text-[#111] text-[14px] transition-transform duration-300 ${open ? "rotate-45" : ""}`}>→</span>
                </button>
                <div className="overflow-hidden transition-all duration-500" style={{ maxHeight: open ? 500 : 0 }}>
                  <ul className="pt-4 space-y-2">
                    {row.items.map((it) => (
                      <li key={it} className="text-[#555] text-[15px] leading-loose">• {it}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
          <div className="border-t border-[#DDD]" />
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <div
            className="w-full max-w-[440px] h-[440px] md:h-[520px] rounded-[20px] overflow-hidden mx-auto flex flex-col items-center justify-center transition-all duration-500"
            style={{ background: WHAT_WE_DO[Math.max(0, active)].grad, border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="text-[5rem]">{WHAT_WE_DO[Math.max(0, active)].emoji}</span>
            <span className="font-display text-white text-[28px] mt-4">{WHAT_WE_DO[Math.max(0, active)].title}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Salon Discovery ---------------- */
function SalonDiscovery({ onBook }: { onBook: (s: typeof SALONS[number]) => void }) {
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
    <section id="discover" className="bg-[#0D0D0D] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-white text-4xl md:text-5xl text-center">Discover Salons Near You</h2>

      <div className="flex flex-wrap justify-center gap-3 mt-10">
        {LOCALITIES.map((l) => <Pill key={l} active={loc === l} onClick={() => setLoc(l)}>{l}</Pill>)}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {SERVICES.map((s) => <Pill key={s} active={svc === s} onClick={() => setSvc(s)}>{s}</Pill>)}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        {filtered.map((s) => (
          <article key={s.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[20px] overflow-hidden transition-all duration-300 hover:-translate-y-2" style={{ boxShadow: "0 0 0 transparent" }}>
            <div className="relative h-[200px] flex items-center justify-center" style={{ background: s.gradient }}>
              {s.badge && (
                <span className="absolute top-3 right-3 rounded-full px-3 py-1 text-[11px]" style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37", border: "1px solid #D4AF37" }}>{s.badge}</span>
              )}
              <span className="text-[3rem]">{s.emoji}</span>
            </div>
            <div className="p-5">
              <h3 className="font-display text-white font-bold text-[20px]">{s.name}</h3>
              <p className="text-[#888] text-[13px] mt-1">📍 {s.locality}</p>
              <p className="text-white text-[13px] mt-2">⭐ {s.rating} · ({s.reviews} reviews)</p>
              <p className="text-white text-[14px] mt-1">₹{s.priceMin} – ₹{s.priceMax}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {s.tags.map((t) => <span key={t} className="border border-[#333] rounded-md px-3 py-1 text-[11px] text-white/90">{t}</span>)}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 border border-white text-white rounded-full px-4 py-2 text-[13px] hover:bg-white hover:text-black transition">View Salon</button>
                <button onClick={() => onBook(s)} className="flex-1 bg-white text-black rounded-full px-4 py-2 text-[13px] font-semibold hover:bg-white/90 transition">Book Now</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-center text-[#888] mt-10">No salons match these filters.</p>}
    </section>
  );
}

function Pill({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-[13px] transition ${active ? "bg-white text-black border border-white" : "border border-[#333] text-white hover:border-white"}`}
    >
      {children}
    </button>
  );
}

/* ---------------- GlamAI ---------------- */
const SCAN_MESSAGES = ["Detecting hair porosity...", "Measuring moisture levels...", "Scanning scalp health...", "Generating your report..."];
const FEATURE_PILLS = [
  { e: "🔬", l: "Hair Porosity Detection" },
  { e: "💧", l: "Moisture Level Scan" },
  { e: "🌡️", l: "Scalp Health Analysis" },
  { e: "✨", l: "Skin Type Detection" },
  { e: "🎯", l: "Treatment Matching" },
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
  const [state, setState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzePhoto);

  useEffect(() => {
    if (state !== "scanning") return;
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
      setState("scanning");
      setMsgIdx(0);
      const base64 = dataUrl.split(",")[1] ?? "";
      const mediaType = file.type || "image/jpeg";
      try {
        const r = await analyze({ data: { imageBase64: base64, mediaType } });
        setResult(r);
        setState("done");
      } catch (e: any) {
        setError(e?.message ?? "Could not analyze photo. Please try a clearer image in good lighting.");
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
    <section id="glamai" className="bg-[#0D0D0D] py-24 px-6 md:px-[60px]">
      <div className="text-center max-w-[700px] mx-auto">
        <span className="inline-block rounded-full px-4 py-1 text-[11px] uppercase tracking-[0.2em]" style={{ border: "1px solid #6B2737", color: "#6B2737" }}>
          ✦ Powered by Lovable AI
        </span>
        <h2 className="font-display text-white text-4xl md:text-[64px] leading-[1.1] mt-6">GlamAI Reads Your Hair &amp; Skin.</h2>
        <p className="text-[#888] text-[16px] mt-4">
          The world's first AI beauty diagnosis for salons. Upload one photo — get a complete hair or skin health report and find Mumbai salons that treat your exact condition.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-12">
        {FEATURE_PILLS.map((p, i) => (
          <div key={p.l} className="relative overflow-hidden bg-[#111] border border-[#222] rounded-2xl px-6 py-4 text-center fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="absolute inset-0 shimmer pointer-events-none" />
            <div className="text-2xl">{p.e}</div>
            <div className="text-white text-[13px] font-medium mt-1">{p.l}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mt-16 max-w-6xl mx-auto">
        {/* LEFT: upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`rounded-[28px] p-10 md:p-12 min-h-[480px] flex flex-col items-center justify-center text-center transition-colors`}
          style={{ background: "#0D0D0D", border: `2px dashed ${dragOver ? "#fff" : "#333"}` }}
        >
          {state === "idle" && (
            <>
              <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                <span className="absolute inset-0 rounded-full pulse-ring" style={{ background: "rgba(107,39,55,0.5)" }} />
                <span className="absolute inset-0 rounded-full pulse-ring-2" style={{ background: "rgba(107,39,55,0.4)" }} />
                <span className="absolute inset-0 rounded-full pulse-ring-3" style={{ background: "rgba(107,39,55,0.3)" }} />
                <span className="relative z-10 text-white text-3xl">📷</span>
              </div>
              <h3 className="font-display text-white text-[22px] mt-6">{dragOver ? "Drop it here ✦" : "Upload Your Hair or Skin Photo"}</h3>
              <p className="text-[#888] text-[14px] mt-2">Clear photo in good lighting gives best results</p>
              <button onClick={() => inputRef.current?.click()} className="mt-6 bg-white text-black rounded-full px-8 py-3 font-semibold hover:bg-white/90 transition">Choose Photo</button>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </>
          )}

          {state === "scanning" && preview && (
            <>
              <div className="relative w-[200px] h-[200px]">
                <img src={preview} alt="upload" className="w-full h-full rounded-full object-cover" />
                <div className="absolute -inset-2 rounded-full spin-ring" style={{ border: "3px solid transparent", borderTopColor: "#6B2737" }} />
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="scan-line absolute left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #6B2737, transparent)" }} />
                </div>
              </div>
              <p className="text-white text-[16px] mt-6">GlamAI is analyzing your photo...</p>
              <p key={msgIdx} className="text-[#888] text-[13px] mt-2 fade-up">{SCAN_MESSAGES[msgIdx]}</p>
            </>
          )}

          {state === "done" && preview && (
            <>
              <div className="relative">
                <img src={preview} alt="upload" className="w-[160px] h-[160px] rounded-full object-cover" style={{ border: "3px solid #4ADE80" }} />
              </div>
              <p className="text-[#4ADE80] text-[14px] mt-4">✓ Analysis Complete</p>
              <button onClick={reset} className="mt-4 text-[#888] text-[13px] hover:text-white transition">Scan another photo</button>
            </>
          )}

          {state === "error" && (
            <>
              <span className="text-4xl">😕</span>
              <p className="text-white text-[16px] mt-4">{error}</p>
              <button onClick={reset} className="mt-6 bg-white text-black rounded-full px-6 py-3 font-semibold">Try Again</button>
            </>
          )}
        </div>

        {/* RIGHT: results */}
        <div className="min-h-[480px]">
          {state === "idle" || state === "error" ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <span className="text-4xl">✨</span>
              <h3 className="font-display text-white text-[24px] mt-4">Your GlamAI Report Will Appear Here</h3>
              <p className="text-[#888] text-[14px] mt-2 max-w-sm">Upload a photo to get your personalized beauty diagnosis</p>
              <div className="w-full max-w-sm mt-8 space-y-3 blur-sm select-none">
                {["Hair Porosity: ██████ ?/10", "Moisture Level: ████ ?/10", "Damage Score: ████████ ?/10"].map((t) => (
                  <div key={t} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-[#666] text-[13px]">{t}</div>
                ))}
              </div>
            </div>
          ) : state === "scanning" ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative h-24 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
              ))}
            </div>
          ) : (
            result && <ResultsView r={result} />
          )}
        </div>
      </div>
    </section>
  );
}

function ResultsView({ r }: { r: ScanResult }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(5, r.damage_level)) / 5 * 100), 80);
    return () => clearTimeout(t);
  }, [r]);
  const damageColor = r.damage_level <= 2 ? "#4ADE80" : r.damage_level === 3 ? "#F59E0B" : "#EF4444";
  const urgencyColor = r.urgency === "routine" ? "#4ADE80" : r.urgency === "important" ? "#F59E0B" : "#EF4444";
  const typeColor = r.concern_type === "hair" ? "#6B2737" : "#1E40AF";
  return (
    <div className="space-y-4 fade-up">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[20px] p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wider" style={{ background: typeColor + "33", color: typeColor === "#6B2737" ? "#ff8aa0" : "#a5b4fc", border: `1px solid ${typeColor}` }}>{r.concern_type}</span>
          <span className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wider" style={{ background: urgencyColor + "22", color: urgencyColor, border: `1px solid ${urgencyColor}` }}>{r.urgency}</span>
        </div>
        <h3 className="font-display text-white text-[24px] font-bold mt-3">{r.condition}</h3>
        <div className="mt-4">
          <div className="flex justify-between text-[13px] text-[#888]"><span>Damage Level</span><span className="text-white">{r.damage_level}/5</span></div>
          <div className="mt-2 h-2 bg-[#333] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${w}%`, background: damageColor }} />
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[20px] p-6">
        <p className="text-white text-[14px] font-semibold mb-3">✦ Recommended Treatments</p>
        <div className="flex flex-wrap gap-2">
          {r.treatments.map((t, i) => (
            <span key={i} className="border border-[#333] text-white rounded-full px-4 py-2 text-[14px]">{["💆", "🌿", "⚡"][i % 3]} {t}</span>
          ))}
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[20px] p-6">
        <p className="text-[#D4AF37] text-[14px] font-semibold mb-2">💡 GlamAI Pro Tip</p>
        <p className="text-white text-[15px] italic">{r.tip}</p>
      </div>

      <div className="rounded-[20px] p-6" style={{ background: "linear-gradient(135deg,#1a0812,#6B2737)" }}>
        <h4 className="font-display text-white text-[20px]">3 Mumbai Salons Treat This Condition</h4>
        <p className="text-[#ddd] text-[13px] mt-1">Based on your diagnosis, these salons specialize in {r.treatments[0]}</p>
        <a href="#discover" className="inline-block mt-4 bg-white text-black rounded-full px-6 py-3 font-semibold">View Matched Salons →</a>
      </div>
    </div>
  );
}

/* ---------------- Team ---------------- */
function Team() {
  return (
    <section id="team" className="bg-[#0D0D0D] py-24">
      <div className="grid lg:grid-cols-2 gap-8 px-6 md:px-[60px] mb-12">
        <div>
          <h2 className="font-display font-bold text-white text-4xl md:text-[56px] leading-none">OUR CREATIVE</h2>
          <h2 className="font-display font-bold italic text-white text-4xl md:text-[56px] leading-none">TEAM &amp; WORK</h2>
        </div>
        <div className="lg:text-right flex flex-col lg:items-end justify-center gap-4">
          <p className="text-[#888] text-[16px] max-w-[320px]">We work with only the finest Mumbai stylists, carefully selected for their skill and artistry.</p>
          <button className="border border-white text-white rounded-full px-6 py-3 text-[14px] hover:bg-white hover:text-black transition w-fit">View all stylists →</button>
        </div>
      </div>

      <div className="overflow-x-auto hide-scrollbar">
        <div className="flex px-6 md:px-[60px]" style={{ width: "max-content" }}>
          {STYLISTS.map((s, i) => (
            <div key={s.name} className={`group relative flex-shrink-0 w-[240px] sm:w-[260px] h-[440px] overflow-hidden cursor-pointer ${i === 2 ? "ring-1 ring-white/10" : ""}`} style={{ background: s.g }}>
              <span className="absolute top-4 left-4 z-10 bg-black/70 text-white text-[10px] uppercase tracking-widest px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">{s.role}</span>
              <div className="absolute inset-0 flex items-center justify-center text-[4rem] transition-transform duration-500 group-hover:scale-110">{s.emoji}</div>
              <div className={`absolute inset-0 bg-black/55 transition-opacity duration-400 ${i === 2 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <div className={`absolute inset-x-0 bottom-0 p-5 translate-y-4 group-hover:translate-y-0 transition-transform duration-400 ${i === 2 ? "translate-y-0" : ""}`}>
                <p className={`font-display text-white font-bold text-[22px] sm:text-[26px] transition-opacity duration-400 ${i === 2 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{s.name}</p>
                <p className={`text-[#bbb] text-[12px] mt-1 transition-opacity duration-400 ${i === 2 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{s.role} · {s.exp} · {s.loc}</p>
                <div className={`flex gap-2 mt-3 transition-opacity duration-400 ${i === 2 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {["⬡", "✕", "📷", "▶"].map((ic) => (
                    <span key={ic} className="w-8 h-8 rounded-full border border-white/60 text-white text-[12px] flex items-center justify-center">{ic}</span>
                  ))}
                </div>
                <button className={`mt-3 bg-white text-black rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity duration-400 ${i === 2 ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>Book This Stylist →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 360 Tour ---------------- */
const TOUR_SALONS = [
  { name: "Mirrors Salon & Spa", loc: "Bandra West", emoji: "✂️", g: "linear-gradient(135deg,#1a0a0a,#3d1515)" },
  { name: "The Gloss Studio", loc: "Juhu", emoji: "💇", g: "linear-gradient(135deg,#0a0a1a,#151540)" },
  { name: "Studio Noir", loc: "Colaba", emoji: "👰", g: "linear-gradient(135deg,#0a0a0a,#303030)" },
  { name: "Luxe Locks", loc: "Andheri", emoji: "🧔", g: "linear-gradient(135deg,#0a1a0a,#154030)" },
];

function Tour360() {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [pan, setPan] = useState(0);
  const startX = useRef(0);
  const cur = TOUR_SALONS[idx];

  return (
    <section className="bg-[#F5F5F5] text-[#111] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-center text-[#111] text-4xl md:text-5xl">Step Inside Before You Book</h2>
      <p className="text-center text-[#666] text-[16px] mt-3">Explore salon interiors with our immersive 360° virtual tour</p>

      <div
        className="relative w-full h-[460px] rounded-3xl overflow-hidden mt-12 border border-[#DDD] select-none"
        style={{ background: cur.g }}
        onMouseDown={(e) => { setDrag(true); startX.current = e.clientX; }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
        onMouseMove={(e) => { if (drag) setPan((e.clientX - startX.current) * 0.3); }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform" style={{ transform: `translateX(${pan}px)` }}>
          <span className="text-white/10 font-display" style={{ fontSize: 200 }}>360°</span>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-white text-[64px]">↻</span>
          <span className="text-[#bbb] text-[12px] tracking-[0.3em] mt-2">{drag ? "EXPLORING... →" : "DRAG TO EXPLORE"}</span>
        </div>
        <div className="absolute bottom-6 left-6 pointer-events-none">
          <p className="font-display text-white text-2xl">{cur.name}, {cur.loc}</p>
          <p className="text-[#bbb] text-[13px] mt-1">Click and drag to look around</p>
        </div>
        <span className="absolute top-6 right-6 bg-black/70 text-white text-[12px] tracking-widest rounded-full px-4 py-2">VR MODE</span>
      </div>

      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {TOUR_SALONS.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setIdx(i)}
            className="relative rounded-xl overflow-hidden flex items-end justify-start p-3 text-left transition-all"
            style={{ width: 200, height: 110, background: t.g, border: `2px solid ${idx === i ? "#111" : "transparent"}` }}
          >
            <span className="absolute top-2 right-2 text-2xl">{t.emoji}</span>
            <div>
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
    <section className="bg-[#F5F5F5] text-[#111] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-center text-[#111] text-4xl md:text-5xl">Mumbai Trusts GlamSpot</h2>
      <p className="text-center text-[#666] text-[16px] mt-2">Real stories from real clients</p>

      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="bg-white rounded-3xl p-8" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <p className="text-[#D4AF37] text-lg">⭐⭐⭐⭐⭐</p>
            <p className="text-[#333] text-[16px] italic leading-[1.7] mt-4">"{t.quote}"</p>
            <div className="flex items-center gap-3 mt-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-display text-white text-[18px]" style={{ background: t.g }}>{t.init}</div>
              <div>
                <p className="font-semibold text-[#111] text-[15px]">{t.name}</p>
                <p className="text-[#888] text-[13px]">{t.loc}</p>
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
    <section className="bg-[#0D0D0D] py-16">
      <h3 className="font-display text-white text-3xl md:text-[36px] text-center mb-10">Trusted Products. Premium Salons.</h3>
      <div className="overflow-hidden">
        <div className="flex gap-4 w-max scroll-brands">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span key={i} className="border border-[#333] rounded-full px-7 py-3 text-white text-[14px] whitespace-nowrap flex-shrink-0">{b}</span>
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
    <footer className="bg-[#0D0D0D] border-t border-[#222] px-6 md:px-[60px] py-20">
      <div className="flex flex-wrap justify-between items-start gap-8">
        <div>
          <p className="font-display text-white text-[28px]">GlamSpot</p>
          <p className="text-[#888] text-[14px] mt-1">Mumbai's Beauty OS</p>
        </div>
        <div className="flex gap-3">
          {["IG", "X", "▶"].map((s) => (
            <span key={s} className="w-10 h-10 rounded-full border border-white/40 text-white flex items-center justify-center text-[13px]">{s}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-white font-semibold text-[14px] mb-4">{c.title}</p>
            <ul className="space-y-2">
              {c.items.map((it) => (
                <li key={it}><a href="#" className="text-[#888] text-[14px] hover:text-white transition">{it}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-[#222] flex flex-wrap justify-between gap-2 text-[#888] text-[13px]">
        <p>© 2026 GlamSpot. Built with ❤️ at SuperXgen AI Buildathon</p>
        <p>Powered by Lovable AI · React · TanStack</p>
      </div>
    </footer>
  );
}

/* ---------------- Booking Modal ---------------- */
const BOOKING_SERVICES = ["Haircut", "Hair Color", "Keratin", "Facial", "Bridal Makeup", "Nail Art", "Men's Grooming", "Hair Spa"];
const BOOKING_STYLISTS = [
  { name: "Priya S.", spec: "Hair Artist", emoji: "💇", r: 4.9 },
  { name: "Rohan M.", spec: "Colorist", emoji: "✂️", r: 4.8 },
  { name: "Meera S.", spec: "Bridal Expert", emoji: "👰", r: 5.0 },
];
const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];
const BOOKED_SLOTS = new Set(["12:00 PM", "4:00 PM"]);

function BookingModal({ salon, onClose }: { salon?: typeof SALONS[number]; onClose: () => void }) {
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
      arr.push({ label: i === 0 ? "Today" : dnames[nd.getDay()], sub: String(nd.getDate()), key: nd.toISOString().slice(0, 10) });
    }
    return arr;
  }, []);

  const canNext = step === 0 ? services.length > 0 : step === 1 ? !!stylist : step === 2 ? !!date && !!time : true;
  const labels = ["Service", "Stylist", "Date & Time", "Confirm"];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
      <div className="modal-in bg-[#1A1A1A] border border-[#2A2A2A] rounded-[28px] max-w-[520px] w-full p-8 md:p-10 max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 text-white text-xl hover:opacity-70">×</button>

        {!done ? (
          <>
            <h3 className="font-display text-white text-[26px] md:text-[28px]">Book Your Appointment</h3>
            <p className="text-[#888] italic text-[14px] mt-1">{salon?.name ?? "Mumbai's finest salons"}</p>

            <div className="flex items-center gap-2 mt-6">
              {labels.map((l, i) => (
                <div key={l} className="flex-1 flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                      i < step ? "bg-[#4ADE80] text-black" : i === step ? "bg-white text-black" : "border border-[#333] text-[#888]"
                    }`}>{i < step ? "✓" : i + 1}</div>
                    <span className="text-[10px] text-[#888]">{l}</span>
                  </div>
                  {i < labels.length - 1 && <div className="flex-1 h-px bg-[#333] -mt-4" />}
                </div>
              ))}
            </div>

            <div className="mt-8">
              {step === 0 && (
                <>
                  <p className="text-white text-[16px] font-semibold mb-4">What would you like?</p>
                  <div className="flex flex-wrap gap-2">
                    {BOOKING_SERVICES.map((s) => {
                      const on = services.includes(s);
                      return (
                        <button key={s} onClick={() => setServices((arr) => on ? arr.filter((x) => x !== s) : [...arr, s])} className={`rounded-full px-4 py-2 text-[13px] transition ${on ? "bg-white text-black border border-white" : "border border-[#333] text-white hover:border-white"}`}>{s}</button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <p className="text-white text-[16px] font-semibold mb-4">Pick your stylist</p>
                  <div className="grid grid-cols-3 gap-3">
                    {BOOKING_STYLISTS.map((s) => {
                      const on = stylist === s.name;
                      return (
                        <button key={s.name} onClick={() => setStylist(s.name)} className={`bg-[#222] rounded-2xl p-4 text-center transition ${on ? "border-white border" : "border border-[#333]"}`}>
                          <div className="text-2xl">{s.emoji}</div>
                          <p className="text-white text-[13px] font-semibold mt-1">{s.name}</p>
                          <p className="text-[#888] text-[11px]">{s.spec}</p>
                          <p className="text-[#D4AF37] text-[11px] mt-1">⭐ {s.r}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-white text-[16px] font-semibold mb-4">Pick date &amp; time</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {days.map((d) => {
                      const on = date === d.key;
                      return (
                        <button key={d.key} onClick={() => setDate(d.key)} className={`flex-shrink-0 rounded-xl border px-3 py-2 text-center transition ${on ? "bg-white text-black border-white" : "border-[#333] text-white"}`}>
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
                            booked ? "bg-[#1a1a1a] text-[#444] border-[#222] cursor-not-allowed"
                              : on ? "bg-white text-black border-white"
                              : "border-[#333] text-white hover:border-white"
                          }`}
                        >{booked ? "Booked" : t}</button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
                    {[
                      ["Salon", salon?.name ?? "GlamSpot Partner"],
                      ["Services", services.join(", ") || "—"],
                      ["Stylist", stylist ?? "—"],
                      ["Date", date ?? "—"],
                      ["Time", time ?? "—"],
                      ["Price", salon ? `₹${salon.priceMin} – ₹${salon.priceMax}` : "₹500 – ₹2000"],
                    ].map(([k, v], i) => (
                      <div key={k as string} className={`flex justify-between py-3 ${i > 0 ? "border-t border-[#222]" : ""}`}>
                        <span className="text-[#888] text-[13px]">{k}</span>
                        <span className="text-white text-[14px] text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setDone(true)} className="w-full bg-white text-black rounded-full py-4 font-bold text-[15px] mt-6 hover:bg-white/90 transition">Confirm Booking</button>
                </>
              )}
            </div>

            {step < 3 && (
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="border border-white text-white rounded-full px-6 py-3 disabled:opacity-30">Back</button>
                <button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="bg-white text-black rounded-full px-6 py-3 font-semibold disabled:opacity-40">Next →</button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#4ADE80]/15 border border-[#4ADE80] mx-auto flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <path className="draw-check" d="M10 21 L18 29 L31 13" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-display text-white text-[28px] mt-6">Booking Confirmed! 🎉</h3>
            <p className="text-[#888] text-[14px] mt-2">See you at {salon?.name ?? "your salon"} on {date ?? "the chosen day"} at {time ?? "your slot"}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button className="border border-white text-white rounded-full px-5 py-2.5">Add to Calendar</button>
              <button onClick={onClose} className="border border-white text-white rounded-full px-5 py-2.5">View Booking</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
