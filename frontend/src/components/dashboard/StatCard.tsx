"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  growth?: number | null;
  delay?: number;
}

export function StatCard({ label, value, icon, color, bgColor, growth, delay = 0 }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 800;
    const startTime = Date.now();
    const timer = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(timer);
    };
    const delayTimer = setTimeout(() => requestAnimationFrame(timer), delay * 100);
    return () => clearTimeout(delayTimer);
  }, [value, delay]);

  return (
    <div
      className="bg-white rounded-2xl p-5 flex items-center justify-between border border-[#E5E7EB]/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default fade-up"
      style={{ animationDelay: `${delay * 0.08}s` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[28px] font-bold text-[#111] leading-none tracking-tight">{displayValue}</p>
          <p className="text-[12px] text-gray-400 mt-1 font-medium">{label}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {growth !== null && growth !== undefined ? (
          <>
            <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-500">
              <TrendingUp size={12} />
              {growth}%
            </span>
            <span className="text-[11px] text-gray-300">vs last month</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-gray-300">
            <Minus size={12} />
          </span>
        )}
      </div>
    </div>
  );
}
