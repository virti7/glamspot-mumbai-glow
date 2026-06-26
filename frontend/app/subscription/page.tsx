"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
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
    <div className="min-h-screen bg-[#FAFAFB]">
      <CustomerNavbar />
      <main className="max-w-5xl mx-auto px-6 pt-[112px] pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2">Subscription</h1>
        <p className="text-sm text-[#6B7280] mb-8">Choose the plan that fits your beauty needs.</p>

        {/* Current Usage */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-[#111827] mb-3">Current Plan: {subscription?.display_name || "Free"}</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-[#F3F4F6] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#EC4899] h-full rounded-full transition-all"
                style={{
                  width: subscription?.scans_limit
                    ? `${Math.min(100, ((subscription.scans_used || 0) / subscription.scans_limit) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <span className="text-sm text-[#6B7280] whitespace-nowrap">
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
                className={`bg-white rounded-2xl border-2 p-6 relative shadow-sm hover:shadow-lg transition-all duration-300 ${isCurrent ? "border-[#EC4899]" : "border-[#E5E7EB]/60"} ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EC4899] text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <plan.icon size={28} className={plan.color} />
                <h3 className="text-xl font-bold text-[#111827] mt-3">{plan.display}</h3>
                <p className="text-sm text-[#6B7280] mt-1">{plan.scans}</p>
                <p className="text-2xl font-bold text-[#111827] mt-3">{plan.price}</p>

                <ul className="mt-5 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#374151]">
                      <Check size={14} className="text-[#EC4899] mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="mt-6 w-full h-[46px] rounded-xl border-2 border-[#EC4899] bg-[#FFF0F5] text-[#DB2777] text-sm font-semibold flex items-center justify-center">
                    Current Plan
                  </div>
                ) : (
                  <button
                    disabled
                    className="mt-6 w-full h-[46px] rounded-xl border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold transition cursor-not-allowed"
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
