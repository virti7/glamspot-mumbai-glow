import { BRANDS } from "@/data/brands";

export function Brands() {
  return (
    <section className="bg-[#F8F8F8] py-16">
      <h3 className="font-display text-[#111] text-3xl md:text-[36px] text-center mb-10">
        Trusted Products. Premium Salons.
      </h3>
      <div className="overflow-hidden">
        <div className="flex gap-4 w-max scroll-brands">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span
              key={i}
              className="bg-white border border-[#E8E8E8] rounded-full px-7 py-3 text-[#333] text-[14px] whitespace-nowrap flex-shrink-0 hover:border-[#F5C842] transition"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
