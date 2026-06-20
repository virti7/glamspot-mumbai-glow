import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { WHAT_WE_DO } from "@/data/what-we-do";

export function WhatWeDo() {
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
