import { Star } from "lucide-react";
import { TESTIMONIALS } from "@/data/testimonials";

export function Testimonials() {
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
