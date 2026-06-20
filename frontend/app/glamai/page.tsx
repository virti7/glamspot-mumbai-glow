"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Sparkles, Upload, AlertTriangle, Lock, ChevronRight } from "lucide-react";

export default function GlamAIPage() {
  const { subscription } = useAuth();
  const [quota, setQuota] = useState<{ allowed: boolean; scansUsed: number; scansLimit: number | null; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getScanQuota()
      .then(setQuota)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isUnlimited = quota?.scansLimit === null;
  const remaining = quota?.remaining ?? 0;
  const total = quota?.scansLimit ?? 0;
  const used = quota?.scansUsed ?? 0;

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold">GlamAI</h1>
            <p className="text-[#6B7280] text-[14px] mt-1">AI-powered hair & skin diagnosis</p>
          </div>
        </div>

        {/* Scan Quota */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-[#F5C842]" />
            <h3 className="font-semibold text-[#111] text-[15px]">Scan Quota</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-[#F8F8F8] rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${remaining === 0 && !isUnlimited ? "bg-red-500" : "bg-[#F5C842]"}`}
                style={{
                  width: isUnlimited ? "100%" : `${Math.min(100, (used / (total || 1)) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[13px] text-[#6B7280] whitespace-nowrap">
              {isUnlimited ? "Unlimited" : `${remaining} / ${total} remaining`}
            </span>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#E8E8E8] p-12 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#FFF9E6] mx-auto flex items-center justify-center mb-4">
            <Upload size={24} className="text-[#F5C842]" />
          </div>
          <h3 className="font-display text-[#111] text-xl font-bold mb-2">Upload Your Photo</h3>
          <p className="text-[#6B7280] text-[14px] mb-6 max-w-md mx-auto">
            Take a clear photo of your hair or skin for AI-powered analysis and personalized recommendations.
          </p>

          {!quota?.allowed && !loading ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
              <Lock size={14} />
              Scan limit reached. Upgrade to continue.
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#111] text-white text-[14px] font-semibold hover:bg-[#333] transition cursor-pointer">
              <Upload size={16} />
              Choose Photo
            </div>
          )}
        </div>

        {/* Previous Scans / Upgrade Prompt */}
        {!quota?.allowed && !isUnlimited && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#111] text-[15px]">Upgrade Required</h3>
              <p className="text-[#6B7280] text-[13px] mt-1">
                You've used all {total} scans on your {subscription?.display_name || "Free"} plan. Upgrade to Premium or Elite for more scans.
              </p>
              <Link
                href="/subscription"
                className="inline-flex items-center gap-1 mt-3 text-[13px] font-semibold text-[#111] bg-white border border-amber-300 rounded-full px-4 py-2 hover:bg-amber-100 transition"
              >
                View Plans <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
