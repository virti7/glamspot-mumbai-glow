"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, type Booking } from "@/services/booking.service";
import { DashboardHeader } from "@/components/DashboardHeader";
import { User, Phone, Mail, DollarSign, Calendar } from "lucide-react";

interface CustomerInfo {
  userId: string;
  name: string;
  phone: string;
  email: string;
  totalSpend: number;
  lastVisit: string;
  bookingsCount: number;
}

export default function SalonCustomersPage() {
  const { loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      bookingService.getSalonBookings()
        .then((bookings) => {
          const map = new Map<string, CustomerInfo>();
          bookings.forEach((b: any) => {
            const uid = b.user_id;
            if (!map.has(uid)) {
              map.set(uid, {
                userId: uid,
                name: b.user?.full_name || "Unknown",
                phone: b.user?.phone || "",
                email: b.user?.email || "",
                totalSpend: 0,
                lastVisit: b.booking_date,
                bookingsCount: 0,
              });
            }
            const c = map.get(uid)!;
            c.totalSpend += b.total_amount || 0;
            c.bookingsCount += 1;
            if (b.booking_date > c.lastVisit) c.lastVisit = b.booking_date;
          });
          setCustomers(Array.from(map.values()));
        })
        .catch(() => setError("Failed to load customers"))
        .finally(() => setLoading(false));
    }
  }, [authLoading]);

  return (
    <div>
      <DashboardHeader />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[#111827] text-2xl md:text-3xl font-bold">Customers</h1>
          <p className="text-[#6B7280] text-sm mt-1">Your customer directory</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#9CA3AF]">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF]">No customer data yet.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]/60 bg-[#F3F4F6]">
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Customer</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Phone</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Total Spend</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Bookings</th>
                  <th className="text-left p-4 text-[12px] font-semibold text-[#6B7280] uppercase">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.userId} className="border-b border-[#E5E7EB]/60 hover:bg-[#FAFAFB]">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-[#9CA3AF]" />
                        <span className="text-[14px] text-[#111827]">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[13px] text-[#6B7280]">{c.phone || "—"}</td>
                    <td className="p-4 text-[14px] font-medium text-[#111827]">₹{c.totalSpend}</td>
                    <td className="p-4 text-[14px] text-[#111827]">{c.bookingsCount}</td>
                    <td className="p-4 text-[13px] text-[#6B7280]">
                      {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
