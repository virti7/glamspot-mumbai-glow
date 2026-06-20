"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { salonService, type Salon, type SalonService } from "@/services/salon.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Clock, DollarSign, TrendingUp } from "lucide-react";

export default function SalonServicesPage() {
  const { profile } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<SalonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role === "salon_owner") {
      salonService.getOwnerSalon()
        .then((s) => {
          setSalon(s);
          return salonService.getServices(s.id);
        })
        .then(setServices)
        .catch(() => setError("No salon found"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [profile]);

  const popularServices = services.filter(s => s.is_popular);
  const regularServices = services.filter(s => !s.is_popular);

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-display text-[#111] text-2xl md:text-3xl font-bold mb-6">Services</h1>
        <p className="text-[#6B7280] text-[14px] -mt-4 mb-6">{salon?.name}</p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[13px]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-[#999]">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-[#999]">No services listed yet.</div>
        ) : (
          <>
            {popularServices.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-[#111] text-[15px] mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#F5C842]" /> Popular Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popularServices.map((svc) => (
                    <div key={svc.id} className="bg-white rounded-xl p-5 border-2 border-[#F5C842]">
                      <span className="px-2 py-0.5 rounded-full bg-[#FFF9E6] text-[#B8860B] text-[10px] font-bold">POPULAR</span>
                      <h4 className="font-semibold text-[#111] text-[15px] mt-2">{svc.name}</h4>
                      {svc.description && <p className="text-[13px] text-[#6B7280] mt-1">{svc.description}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                          <Clock size={13} /> {svc.duration_minutes || 60} min
                        </span>
                        <span className="flex items-center gap-1 text-[15px] font-bold text-[#111]">
                          <DollarSign size={14} /> {svc.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-semibold text-[#111] text-[15px] mb-3">All Services</h3>
            <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E8E8] bg-[#F8F8F8]">
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Service</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Category</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Duration</th>
                    <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {regularServices.map((svc) => (
                    <tr key={svc.id} className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                      <td className="p-4">
                        <span className="text-[14px] text-[#111]">{svc.name}</span>
                        {svc.description && <p className="text-[12px] text-[#6B7280]">{svc.description}</p>}
                      </td>
                      <td className="p-4 text-[13px] text-[#6B7280]">{svc.category || "—"}</td>
                      <td className="p-4 text-[13px] text-[#6B7280]">{svc.duration_minutes || 60} min</td>
                      <td className="p-4 text-[14px] font-medium text-[#111]">
                        ₹{svc.price}
                        {svc.discounted_price && (
                          <span className="ml-2 text-[12px] text-green-600 line-through">₹{svc.discounted_price}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
