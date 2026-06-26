"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Clock, Loader2, Save, Sun, Moon, X } from "lucide-react";

const DAYS = [
  { index: 0, short: "Sun", full: "Sunday" },
  { index: 1, short: "Mon", full: "Monday" },
  { index: 2, short: "Tue", full: "Tuesday" },
  { index: 3, short: "Wed", full: "Wednesday" },
  { index: 4, short: "Thu", full: "Thursday" },
  { index: 5, short: "Fri", full: "Friday" },
  { index: 6, short: "Sat", full: "Saturday" },
];

interface DayHours {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

export default function BusinessHoursPage() {
  const { profile } = useAuth();
  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((d) => ({ day_of_week: d.index, is_closed: false, open_time: "09:00", close_time: "19:00" }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!profile || profile.role !== "salon_owner") return;
    api.get<any[]>("/salon-management/hours")
      .then((data) => {
        if (data && data.length > 0) {
          setHours(
            DAYS.map((d) => {
              const found = data.find((h) => h.day_of_week === d.index);
              return found
                ? { day_of_week: d.index, is_closed: found.is_closed, open_time: found.open_time || "09:00", close_time: found.close_time || "19:00" }
                : { day_of_week: d.index, is_closed: false, open_time: "09:00", close_time: "19:00" };
            })
          );
        }
      })
      .catch(() => setError("Failed to load hours"))
      .finally(() => setLoading(false));
  }, [profile]);

  const updateDay = (index: number, field: string, value: any) => {
    setHours((prev) => prev.map((h) => h.day_of_week === index ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/salon-management/hours", { hours });
      setSuccess("Business hours updated successfully");
    } catch {
      setError("Failed to update hours");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  const openDays = hours.filter((h) => !h.is_closed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[#111827] text-2xl md:text-3xl font-bold">Business Hours</h1>
          <p className="text-[#6B7280] text-sm mt-1">{openDays} days open · Set your weekly schedule</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EC4899] text-white text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25 disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Hours"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px]">{success}</div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E5E7EB]/60 bg-[#FAFAFB]">
          <div className="grid grid-cols-12 gap-4 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
            <div className="col-span-3">Day</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-3 text-center">Open</div>
            <div className="col-span-3 text-center">Close</div>
            <div className="col-span-1" />
          </div>
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {DAYS.map((day) => {
            const h = hours.find((x) => x.day_of_week === day.index)!;
            const isToday = new Date().getDay() === day.index;
            return (
              <div key={day.index} className={`grid grid-cols-12 gap-4 items-center p-4 ${isToday ? "bg-[#EC4899]/5" : ""}`}>
                <div className="col-span-3">
                  <span className={`text-[14px] font-medium ${isToday ? "text-[#EC4899]" : "text-[#111827]"}`}>
                    {day.full}
                  </span>
                  {isToday && <span className="ml-2 text-[10px] font-bold text-[#EC4899]">TODAY</span>}
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => updateDay(day.index, "is_closed", !h.is_closed)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all ${
                      h.is_closed
                        ? "bg-red-50 text-red-500 border border-red-200"
                        : "bg-green-50 text-green-600 border border-green-200"
                    }`}
                  >
                    {h.is_closed ? "Closed" : "Open"}
                  </button>
                </div>
                <div className="col-span-3 flex justify-center">
                  {h.is_closed ? (
                    <span className="text-[13px] text-[#9CA3AF]">—</span>
                  ) : (
                    <input
                      type="time"
                      value={h.open_time}
                      onChange={(e) => updateDay(day.index, "open_time", e.target.value)}
                      className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-[110px]"
                    />
                  )}
                </div>
                <div className="col-span-3 flex justify-center">
                  {h.is_closed ? (
                    <span className="text-[13px] text-[#9CA3AF]">—</span>
                  ) : (
                    <input
                      type="time"
                      value={h.close_time}
                      onChange={(e) => updateDay(day.index, "close_time", e.target.value)}
                      className="h-12 rounded-xl border border-[#E5E7EB] px-4 text-sm focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] w-[110px]"
                    />
                  )}
                </div>
                <div className="col-span-1 flex justify-center">
                  {h.is_closed ? <Moon size={14} className="text-[#9CA3AF]" /> : <Sun size={14} className="text-amber-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
