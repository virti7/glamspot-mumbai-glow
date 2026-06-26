import { Instagram, Twitter, Youtube, Facebook, ArrowRight } from "lucide-react";
import { STYLISTS } from "@/data/stylists";

export function Team() {
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
          {STYLISTS.map((s) => (
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
                <span className="inline-block mt-2 rounded-full px-3 py-1 text-[11px] bg-[rgba(236,72,153,0.2)] text-[#EC4899] opacity-0 group-hover:opacity-100 transition-opacity duration-400">
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
