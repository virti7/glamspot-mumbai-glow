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
