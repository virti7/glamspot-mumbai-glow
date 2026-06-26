import { useMemo, useState } from "react";
import { MapPin, Star } from "lucide-react";
import { SALONS, LOCALITIES, SERVICES } from "@/data/salons";

export function SalonDiscovery({ onBook }: { onBook: (s: (typeof SALONS)[number]) => void }) {
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
    <section id="discover" className="bg-[#FAFAFB] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-[#111827] text-4xl md:text-5xl font-bold text-center">
        Discover Salons Near You
      </h2>

      <div className="flex flex-wrap justify-center gap-2 mt-10">
        {LOCALITIES.map((l) => (
          <Pill key={l} active={loc === l} onClick={() => setLoc(l)}>
            {l}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
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
            className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl shadow-sm"
          >
            <div className="relative h-[200px] overflow-hidden">
              <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
              {s.badge && (
                <span className="absolute top-3 right-3 rounded-xl px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs font-medium text-[#111827] shadow-sm border border-[#E5E7EB]/60">
                  {s.badge}
                </span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-display text-[#111827] font-bold text-xl">{s.name}</h3>
              <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                <MapPin size={13} /> {s.locality}
              </p>
              <p className="text-xs text-[#111827] mt-2 flex items-center gap-1">
                <Star size={13} fill="#EC4899" color="#EC4899" /> {s.rating} · ({s.reviews} reviews)
              </p>
              <p className="text-sm text-[#111827] font-semibold mt-1">
                {"\u20B9"}
                {s.priceMin} – {"\u20B9"}
                {s.priceMax}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {s.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-[#FAFAFB] text-[#6B7280] border border-[#E5E7EB]/60 rounded-lg px-3 py-1 text-[10px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 border border-[#E5E7EB] text-[#6B7280] rounded-xl px-4 py-2.5 text-xs hover:border-[#111827] hover:text-[#111827] transition-all">
                  View Salon
                </button>
                <button
                  onClick={() => onBook(s)}
                  className="flex-1 bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white rounded-xl px-4 py-2.5 text-xs font-semibold hover:shadow-lg hover:shadow-[#EC4899]/30 transition-all"
                >
                  Book Now
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-[#9CA3AF] mt-10">No salons match these filters.</p>
      )}
    </section>
  );
}

function Pill({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[#EC4899] text-white border border-[#EC4899] shadow-sm"
          : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#EC4899] hover:text-[#EC4899]"
      }`}
    >
      {children}
    </button>
  );
}
