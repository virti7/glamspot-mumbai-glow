import { useEffect, useState } from "react";
import { Sparkles, Zap, ArrowRight } from "lucide-react";
import type { ScanResult } from "@/data/glamai";

export function ResultsView({ r }: { r: ScanResult }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((Math.max(0, Math.min(5, r.damage_level)) / 5) * 100), 80);
    return () => clearTimeout(t);
  }, [r]);
  const damageColor = r.damage_level <= 3 ? "#EC4899" : "#EF4444";
  const urgencyColor =
    r.urgency === "routine" ? "#4ADE80" : r.urgency === "important" ? "#EC4899" : "#EF4444";
  return (
    <div className="space-y-4 fade-up">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-semibold"
            style={{ background: "#EC489922", color: "#EC4899", border: "1px solid #EC4899" }}
          >
            {r.concern_type}
          </span>
          <span
            className="rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-semibold"
            style={{
              background: urgencyColor + "22",
              color: urgencyColor,
              border: `1px solid ${urgencyColor}`,
            }}
          >
            {r.urgency}
          </span>
        </div>
        <h3 className="font-display text-white text-lg font-bold mt-2">{r.condition}</h3>
        <div className="mt-3">
          <div className="flex justify-between text-[12px] text-[#888]">
            <span>Damage Level</span>
            <span className="text-white">{r.damage_level}/5</span>
          </div>
          <div className="mt-1.5 h-2 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${w}%`, background: damageColor }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white text-[13px] font-semibold mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#EC4899]" /> Recommended Treatments
        </p>
        <div className="flex flex-wrap gap-1.5">
          {r.treatments.map((t, i) => (
            <span
              key={i}
              className="bg-[#EC4899] text-white font-semibold rounded-xl px-3 py-1.5 text-xs"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="border border-[#EC4899]/30 rounded-2xl p-5 bg-white/5">
        <p className="text-[#EC4899] text-[13px] font-semibold mb-1 flex items-center gap-1.5">
          <Zap size={12} /> GlamAI Pro Tip
        </p>
        <p className="text-white text-[13px] italic">{r.tip}</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h4 className="font-display text-white text-lg font-bold">
          3 Mumbai Salons Treat This Condition
        </h4>
        <p className="text-[#9CA3AF] text-[12px] mt-0.5">
          Based on your diagnosis, these salons specialize in {r.treatments[0]}
        </p>
        <a
          href="#discover"
          className="inline-flex items-center gap-2 mt-2.5 bg-[#EC4899] text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-[#DB2777] transition-all"
        >
          Find Matched Salons <ArrowRight size={12} className="inline" />
        </a>
      </div>
    </div>
  );
}
