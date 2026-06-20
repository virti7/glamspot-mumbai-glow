import { MapPin, ChevronRight, ArrowRight, Sparkles, Store, Star, Sparkles as SparklesIcon, CalendarDays } from "lucide-react";

export function Hero({ onBook }: { onBook: () => void }) {
  const cards = [
    {
      loc: "BANDRA",
      name: "Mirror's Studio",
      svc: "Hair & Bridal",
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80",
    },
    {
      loc: "JUHU",
      name: "The Gloss Studio",
      svc: "Balayage",
      image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80",
    },
    {
      loc: "",
      name: "",
      svc: "Color & Spa",
      image: "https://images.unsplash.com/photo-1633681138600-295fcd688876?w=400&q=80",
    },
  ];

  const stats = [
    { icon: Store, value: "500+", label: "Top Salons" },
    { icon: Star, value: "50K+", label: "Happy Customers" },
    { icon: SparklesIcon, value: "AI Powered", label: "Beauty Insights" },
    { icon: CalendarDays, value: "10K+", label: "Bookings Done" },
  ];

  return (
    <section
      id="top"
      className="relative min-h-screen bg-white pt-28 pb-20 px-6 md:px-[60px] overflow-hidden"
    >
      <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
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
              {c.loc && (
                <span className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 text-[11px] flex items-center gap-1.5 shadow-md">
                  <MapPin size={12} className="text-[#111]" />
                  <span className="text-[#111]">{c.loc}</span>
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4">
                {c.name && <p className="font-display text-white text-[18px]">{c.name}</p>}
                <p className="text-[#ccc] text-[13px]">{c.svc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 sm:gap-12 lg:gap-16 mt-8 border-t border-[#E8E8E8] pt-8">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F5F0FF] flex items-center justify-center">
              <s.icon size={18} className="text-[#7C3AED]" />
            </div>
            <div>
              <p className="font-bold text-[#111] text-[15px]">{s.value}</p>
              <p className="text-[#888] text-[12px]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 inset-x-0 text-center text-[#999] text-[12px] tracking-widest uppercase bounce-y">
        <ChevronRight size={14} className="inline rotate-90" /> scroll to explore
      </div>
    </section>
  );
}
