import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { EXCLUSIVE_SERVICES } from "@/data/exclusive-services";

export function ExclusiveHairServices({ onBook }: { onBook?: () => void }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const totalSlides = Math.ceil(EXCLUSIVE_SERVICES.length / 3);

  const prev = () => setSlideIdx((i) => (i > 0 ? i - 1 : totalSlides - 1));
  const next = () => setSlideIdx((i) => (i < totalSlides - 1 ? i + 1 : 0));

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
              className="w-[48px] h-[48px] rounded-full border border-[#EC4899] text-[#EC4899] flex items-center justify-center hover:bg-[#EC4899] hover:text-white transition-all duration-200"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="w-[48px] h-[48px] rounded-full border border-[#EC4899] text-[#EC4899] flex items-center justify-center hover:bg-[#EC4899] hover:text-white transition-all duration-200"
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
                    <button
                      onClick={onBook}
                      className="bg-[#EC4899] text-white rounded-full px-5 py-2 text-[13px] font-semibold hover:bg-[#DB2777] transition-colors"
                    >
                      Book Now <ArrowRight size={12} className="inline" />
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-[#111] px-6 py-5">
                    <p className="font-display text-white font-bold text-[22px]">{svc.name}</p>
                    <p className="text-[#EC4899] uppercase text-[11px] tracking-[0.2em] mt-1">
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
              background: slideIdx === i ? "#EC4899" : "#333",
            }}
          />
        ))}
      </div>
    </section>
  );
}
