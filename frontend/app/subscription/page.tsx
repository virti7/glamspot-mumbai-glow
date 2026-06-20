"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Check, Sparkles, Crown, Star, ChevronRight } from "lucide-react";

const plans = [
  {
    name: "free",
    display: "Free",
    scans: "1 scan (lifetime)",
    price: "Free",
    features: ["1 AI scan (lifetime)", "1 image per scan", "Basic analysis"],
    icon: Star,
    color: "text-gray-500",
    popular: false,
  },
  {
    name: "premium",
    display: "Premium",
    scans: "10 scans/month",
    price: "₹499/mo",
    features: ["10 AI scans per month", "10 images per scan", "Priority support", "Detailed analysis"],
    icon: Sparkles,
    color: "text-[#F5C842]",
    popular: true,
  },
  {
    name: "elite",
    display: "Elite",
    scans: "Unlimited",
    price: "₹1,499/mo",
    features: ["Unlimited AI scans", "Unlimited images", "Priority support", "Detailed analysis", "Early access to new features"],
    icon: Crown,
    color: "text-purple-500",
    popular: false,
  },
];

export default function SubscriptionPage() {
  const { profile, subscription } = useAuth();
  const currentPlan = subscription?.plan_name || "free";

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-2">Subscription</h1>
        <p className="text-[#6B7280] text-[14px] mb-8">Choose the plan that fits your beauty needs.</p>

        {/* Current Usage */}
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 mb-8">
          <h3 className="font-semibold text-[#111] text-[15px] mb-3">Current Plan: {subscription?.display_name || "Free"}</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-[#F8F8F8] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#F5C842] h-full rounded-full transition-all"
                style={{
                  width: subscription?.scans_limit
                    ? `${Math.min(100, ((subscription.scans_used || 0) / subscription.scans_limit) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <span className="text-[13px] text-[#6B7280] whitespace-nowrap">
              {subscription?.scans_used || 0} / {subscription?.scans_limit || 0} scans used
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            return (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border-2 p-6 relative ${isCurrent ? "border-[#F5C842]" : "border-[#E8E8E8]"} ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F5C842] text-[#111] text-[11px] font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <plan.icon size={28} className={plan.color} />
                <h3 className="font-display text-[#111] text-xl font-bold mt-3">{plan.display}</h3>
                <p className="text-[#6B7280] text-[13px] mt-1">{plan.scans}</p>
                <p className="font-display text-[#111] text-2xl font-bold mt-3">{plan.price}</p>

                <ul className="mt-5 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[#333]">
                      <Check size={14} className="text-[#F5C842] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="mt-6 w-full h-[46px] rounded-xl border-2 border-[#F5C842] bg-[#FFF9E6] text-[#B8860B] text-[14px] font-semibold flex items-center justify-center">
                    Current Plan
                  </div>
                ) : (
                  <button
                    disabled
                    className="mt-6 w-full h-[46px] rounded-xl border border-[#E8E8E8] text-[#6B7280] text-[14px] font-semibold hover:bg-[#F8F8F8] transition cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
