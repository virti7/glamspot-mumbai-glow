import { Instagram, Twitter, Youtube, Sparkles } from "lucide-react";

export function Footer() {
  const cols = [
    { title: "Discover", items: ["Browse Salons", "By Locality", "By Service", "Top Rated"] },
    { title: "Company", items: ["About Us", "Careers", "Press", "Blog"] },
    { title: "Support", items: ["Help Center", "Contact", "Privacy Policy", "Terms"] },
    { title: "Cities", items: ["Mumbai", "Bangalore", "Delhi", "Pune", "Hyderabad"] },
  ];
  return (
    <footer className="bg-[#111] border-t border-[#333] px-6 md:px-[60px] py-20">
      <div className="flex flex-wrap justify-between items-start gap-8">
        <div>
          <p className="font-display text-white text-[28px]">GlamSpot</p>
          <p className="text-[#888] text-[14px] mt-1">Mumbai's Beauty OS</p>
        </div>
        <div className="flex gap-3">
          {[<Instagram size={14} />, <Twitter size={14} />, <Youtube size={14} />].map((ic, i) => (
            <span
              key={i}
              className="w-10 h-10 rounded-full border border-white/40 text-white flex items-center justify-center hover:border-[#F5C842] hover:text-[#F5C842] transition cursor-pointer"
            >
              {ic}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-white font-semibold text-[14px] mb-4">{c.title}</p>
            <ul className="space-y-2">
              {c.items.map((it) => (
                <li key={it}>
                  <a href="#" className="text-[#888] text-[14px] hover:text-[#F5C842] transition">
                    {it}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-[#333] flex flex-wrap justify-between gap-2 text-[#888] text-[13px]">
        <p>
          &copy; 2026 GlamSpot. Built with <Sparkles size={12} className="inline" /> at SuperXgen AI
          Buildathon
        </p>
        <p>Powered by AI &middot; React &middot; TanStack</p>
      </div>
    </footer>
  );
}
