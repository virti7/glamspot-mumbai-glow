import { useEffect, useState } from "react";
import { Sparkles, Zap, ArrowRight } from "lucide-react";
import type { ScanResult } from "@/data/glamai";

export function ResultsView({ r }: { r: ScanResult }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((Math.max(0, Math.min(5, r.damage_level)) / 5) * 100), 80);
    return () => clearTimeout(t);
  }, [r]);
  const damageColor = r.damage_level <= 3 ? "#F5C842" : "#EF4444";
  const urgencyColor =
    r.urgency === "routine" ? "#4ADE80" : r.urgency === "important" ? "#F5C842" : "#EF4444";
  return (
    <div className="space-y-3 fade-up">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-4">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
            style={{ background: "#F5C84222", color: "#F5C842", border: "1px solid #F5C842" }}
          >
            {r.concern_type}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider"
            style={{
              background: urgencyColor + "22",
              color: urgencyColor,
              border: `1px solid ${urgencyColor}`,
            }}
          >
            {r.urgency}
          </span>
        </div>
        <h3 className="font-display text-white text-[18px] font-bold mt-2">{r.condition}</h3>
        <div className="mt-3">
          <div className="flex justify-between text-[12px] text-[#888]">
            <span>Damage Level</span>
            <span className="text-white">{r.damage_level}/5</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{ width: `${w}%`, background: damageColor }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-4">
        <p className="text-white text-[13px] font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#F5C842]" /> Recommended Treatments
        </p>
        <div className="flex flex-wrap gap-1.5">
          {r.treatments.map((t, i) => (
            <span
              key={i}
              className="bg-[#F5C842] text-[#111] font-semibold rounded-full px-3 py-1 text-[12px]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-4">
        <p className="text-[#F5C842] text-[13px] font-semibold mb-1 flex items-center gap-1.5">
          <Zap size={12} /> GlamAI Pro Tip
        </p>
        <p className="text-white text-[13px] italic">{r.tip}</p>
      </div>

      <div className="rounded-[16px] p-4 bg-[#1A1A1A] border border-[#F5C842]/30">
        <h4 className="font-display text-white text-[16px]">
          3 Mumbai Salons Treat This Condition
        </h4>
        <p className="text-[#ddd] text-[12px] mt-0.5">
          Based on your diagnosis, these salons specialize in {r.treatments[0]}
        </p>
        <a
          href="#discover"
          className="inline-block mt-2.5 bg-[#F5C842] text-[#111] rounded-full px-5 py-2 text-[13px] font-bold hover:bg-[#e0b635] transition"
        >
          Find Matched Salons <ArrowRight size={12} className="inline" />
        </a>
      </div>
    </div>
  );
}
