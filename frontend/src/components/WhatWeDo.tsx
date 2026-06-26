import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { WHAT_WE_DO } from "@/data/what-we-do";

export function WhatWeDo() {
  const [active, setActive] = useState(0);
  return (
    <section id="what-we-do" className="bg-white text-[#111827] py-24 px-6 md:px-[60px]">
      <div className="grid lg:grid-cols-2 gap-12 mb-12">
        <h2 className="font-display font-bold text-[#111827] text-4xl md:text-5xl leading-tight flex items-center">
          What We Do
          <span className="inline-block w-1 h-12 rounded-full bg-gradient-to-b from-[#EC4899] to-[#DB2777] ml-4" />
        </h2>
        <p className="text-base text-[#6B7280] max-w-md self-center">
          GlamSpot connects you to Mumbai's finest salons. Whether it's a quick trim or a full
          bridal transformation, we bring the city's best to your fingertips.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-16">
        <div>
          {WHAT_WE_DO.map((row, i) => {
            const open = active === i;
            return (
              <div key={row.title} className="border-t border-[#E5E7EB]/60 py-6">
                <button
                  onClick={() => setActive(open ? -1 : i)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-display font-bold text-[#111827] text-2xl flex items-center gap-3">
                    {row.title} <span className="text-[#EC4899]">{row.icon}</span>
                  </span>
                  <span
                    className={`w-8 h-8 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] transition-all duration-300 hover:bg-[#EC4899] hover:text-white hover:border-[#EC4899] ${open ? "rotate-45" : ""}`}
                  >
                    <ArrowRight size={14} />
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{ maxHeight: open ? 500 : 0 }}
                >
                  <ul className="pt-4 space-y-2.5">
                    {row.items.map((it) => (
                      <li
                        key={it}
                        className="text-sm text-[#6B7280] flex items-start gap-2.5"
                      >
                        <Check size={14} className="mt-0.5 flex-shrink-0 text-[#22C55E]" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
          <div className="border-t border-[#E5E7EB]/60" />
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <div className="w-full max-w-[480px] h-[480px] md:h-[560px] rounded-2xl overflow-hidden mx-auto border border-[#E5E7EB]/60 shadow-xl relative">
            <img
              src={WHAT_WE_DO[Math.max(0, active)].image}
              alt={WHAT_WE_DO[Math.max(0, active)].title}
              className="w-full h-full object-cover transition-all duration-500"
            />
            <div className="absolute bottom-6 left-6">
              <span className="font-display text-white text-2xl bg-black/30 backdrop-blur-md rounded-xl px-5 py-2.5 inline-block">
                {WHAT_WE_DO[Math.max(0, active)].title}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
