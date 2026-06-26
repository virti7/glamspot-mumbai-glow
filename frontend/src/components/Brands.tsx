import { BRANDS } from "@/data/brands";

export function Brands() {
  return (
    <section className="bg-[#FAFAFB] py-16">
      <h3 className="font-display text-[#111] text-3xl md:text-[36px] text-center mb-10">
        Trusted Products. Premium Salons.
      </h3>
      <div className="overflow-hidden">
        <div className="flex gap-4 w-max scroll-brands">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span
              key={i}
              className="bg-white border border-[#E5E7EB] rounded-full px-7 py-3 text-[#333] text-[14px] whitespace-nowrap flex-shrink-0 hover:border-[#EC4899] transition-all duration-200"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
