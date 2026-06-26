"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  X, Check, Star, Calendar, Clock, ArrowRight, ArrowLeft,
  CreditCard, Loader2, CheckCircle2, AlertCircle, MapPin,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService } from "@/services/booking.service";
import { supabaseClient } from "@/lib/auth";
import type { SalonService } from "@/services/salon.service";
import type { AvailableDate, CreateBookingInput } from "@/services/booking.service";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STEP_LABELS = ["Salon", "Services", "Date", "Time", "Details", "Review", "Done"];
const STEP_TITLES = ["Salon Information", "Select Services", "Select Date", "Select Time", "Your Details", "Booking Summary", "Booking Confirmed!"];

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDisplayTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? "PM" : "AM";
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${hr12}:${m} ${ampm}`;
}

function formatTimeRange(open: string | null, close: string | null): string {
  if (!open || !close) return "—";
  return `${formatDisplayTime(open)} – ${formatDisplayTime(close)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? "text-[#F59E0B]" : "text-[#E5E7EB]"}
          fill={s <= Math.round(rating) ? "#F59E0B" : "none"}
        />
      ))}
    </span>
  );
}

interface BookingFlowProps {
  salon: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    address: string | null;
    locality: string;
    city: string;
    cover_image: string | null;
    rating: number;
    reviews_count: number;
    opening_time: string | null;
    closing_time: string | null;
  };
  onClose: () => void;
  onSuccess?: (bookingRef: string) => void;
}

export function BookingFlow({ salon, onClose, onSuccess }: BookingFlowProps) {
  const { user, profile } = useAuth();

  const [step, setStep] = useState(0);

  const [services, setServices] = useState<SalonService[]>([]);
  const [selectedServices, setSelectedServices] = useState<SalonService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [servicesFetched, setServicesFetched] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [datesLoading, setDatesLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, AvailableDate[]>>({});
  const fetchedMonthsRef = useRef<Set<string>>(new Set());

  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [bookingRef, setBookingRef] = useState("");

  useEffect(() => {
    if (profile?.full_name) setCustomerName(profile.full_name);
    if (profile?.phone) setCustomerPhone(profile.phone);
    if (user?.email) setCustomerEmail(user.email);
  }, [profile, user]);

  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError("");
    try {
      const res = await fetch(`/api/salons/${salon.id}/services`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || `Failed to load services (${res.status})`);
      }
      const data = await res.json();
      setServices(data);
    } catch (err: any) {
      console.error("fetchServices error:", err);
      setServicesError(err.message || "Failed to load services");
    } finally {
      setServicesLoading(false);
      setServicesFetched(true);
    }
  }, [salon.id]);

  const loadMonth = useCallback(async (month: Date) => {
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    if (fetchedMonthsRef.current.has(monthKey)) return;

    setDatesLoading(true);
    fetchedMonthsRef.current.add(monthKey);
    try {
      const data = await bookingService.getAvailableDates(salon.id, monthKey);
      setAvailabilityCache((prev) => ({ ...prev, [monthKey]: data }));
    } catch (err) {
      console.error("loadMonth error:", err);
      fetchedMonthsRef.current.delete(monthKey);
    } finally {
      setDatesLoading(false);
    }
  }, [salon.id]);

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 60), 0),
    [selectedServices],
  );

  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot("");
    try {
      const data = await bookingService.getAvailableSlots(salon.id, selectedDate, undefined, totalDuration);
      setAvailableSlots(data);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [salon.id, selectedDate, totalDuration]);

  useEffect(() => {
    if (step === 1 && !servicesFetched && !servicesLoading) {
      fetchServices();
    }
  }, [step, servicesFetched, servicesLoading, fetchServices]);

  useEffect(() => {
    if (step === 2) {
      loadMonth(calendarMonth);
    }
  }, [step, calendarMonth, loadMonth]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, fetchAvailableSlots]);

  useEffect(() => {
    if (!selectedDate || step !== 3) return;
    const client = supabaseClient;
    if (!client) return;
    const channel = client
      .channel(`booking-slots-${salon.id}-${selectedDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `salon_id=eq.${salon.id}` },
        () => {
          fetchAvailableSlots();
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [selectedDate, step, salon.id, fetchAvailableSlots]);

  const canGoPrevMonth = useMemo(() => {
    const now = new Date();
    return calendarMonth.getFullYear() > now.getFullYear() ||
      (calendarMonth.getFullYear() === now.getFullYear() && calendarMonth.getMonth() > now.getMonth());
  }, [calendarMonth]);

  const toggleService = useCallback((svc: SalonService) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      if (exists) return prev.filter((s) => s.id !== svc.id);
      return [...prev, svc];
    });
  }, []);

  const subtotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices],
  );

  const totalDiscount = useMemo(
    () =>
      selectedServices.reduce((sum, s) => {
        if (s.discounted_price) {
          return sum + (Number(s.price) - Number(s.discounted_price));
        }
        return sum;
      }, 0),
    [selectedServices],
  );

  const discountedSubtotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.discounted_price || s.price), 0),
    [selectedServices],
  );

  const endTime = useMemo(() => {
    if (!selectedSlot) return "";
    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const totalMin = hours * 60 + minutes + totalDuration;
    const endH = Math.floor(totalMin / 60);
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [selectedSlot, totalDuration]);

  const platformFee = useMemo(() => Math.round(discountedSubtotal * 0.05), [discountedSubtotal]);
  const tax = useMemo(() => Math.round(discountedSubtotal * 0.12), [discountedSubtotal]);
  const grandTotal = discountedSubtotal + platformFee + tax;

  const handleNext = () => {
    if (step === 4) {
      const e: Record<string, string> = {};
      if (!customerName.trim()) e.name = "Name is required";
      if (!customerPhone.trim()) e.phone = "Phone is required";
      if (!customerEmail.trim()) e.email = "Email is required";
      else if (!isValidEmail(customerEmail)) e.email = "Invalid email format";
      setErrors(e);
      if (Object.keys(e).length > 0) return;
    }
    setStep((s) => Math.min(s + 1, 6));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
  };

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const currentMonthData = useMemo(() => {
    const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
    return availabilityCache[key] || [];
  }, [calendarMonth, availabilityCache]);

  const handleConfirm = async () => {
    setConfirmLoading(true);
    setConfirmError("");
    try {
      const bookingData: CreateBookingInput = {
        salonId: salon.id,
        services: selectedServices.map((s) => ({
          serviceId: s.id,
          name: s.name,
          price: Number(s.price),
          durationMin: s.duration_minutes || 60,
          discountedPrice: s.discounted_price,
        })),
        bookingDate: selectedDate,
        startTime: selectedSlot,
        endTime,
        customerName,
        customerPhone,
        customerEmail,
        specialRequest: specialRequest || undefined,
        paymentMethod: "cash",
      };

      const result = await bookingService.create(bookingData);
      const ref = result.booking_reference || result.id;
      setBookingRef(ref);
      setStep(6);
      onSuccess?.(ref);
    } catch (err: any) {
      const msg = err?.message || "Failed to create booking";
      if (msg.includes("already booked") || msg.includes("409")) {
        setConfirmError("This slot was just booked by someone else. Please go back and select a different time.");
        setAvailableSlots([]);
        setTimeout(() => fetchAvailableSlots(), 1000);
      } else {
        setConfirmError(msg);
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  const canNext = (step === 1 && selectedServices.length === 0) ||
    (step === 2 && !selectedDate) ||
    (step === 3 && !selectedSlot);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:max-w-[520px] overflow-y-auto relative shadow-2xl border border-[#E5E7EB]/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-xl text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition-all flex items-center justify-center z-10"
        >
          <X size={20} />
        </button>

        {step < 6 && (
          <>
            <div className="px-6 pt-10 sm:pt-8 pb-2">
              <div className="flex gap-0.5 sm:gap-1 justify-center">
                {STEP_LABELS.map((l, i) => (
                  <div key={l} className="flex items-center gap-0.5 sm:gap-1 flex-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all ${
                          i < step
                            ? "bg-[#EC4899] text-white"
                            : i === step
                              ? "bg-[#111827] text-white ring-2 ring-[#EC4899]/30"
                              : "border border-[#E5E7EB] text-[#9CA3AF]"
                        }`}
                      >
                        {i < step ? <Check size={10} /> : i + 1}
                      </div>
                      <span className="text-[7px] sm:text-[10px] text-[#9CA3AF] leading-tight">{l}</span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div className="flex-1 h-px bg-[#E5E7EB] -mt-3 sm:-mt-4" />
                    )}
                  </div>
                ))}
              </div>
              <h3 className="font-display text-[#111827] text-xl font-bold text-center mt-5 sm:mt-4">
                {STEP_TITLES[step]}
              </h3>
            </div>

            <div className="px-6 pb-4">
              {/* Step 0 - Salon Info */}
              {step === 0 && (
                <div>
                  <div className="relative h-48 sm:h-40 rounded-2xl overflow-hidden mb-5 bg-[#F3F4F6]">
                    {salon.cover_image ? (
                      <img
                        src={salon.cover_image}
                        alt={salon.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EC4899]/20 to-[#DB2777]/20">
                        <span className="text-5xl font-display font-bold text-[#EC4899]/40">
                          {salon.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-display text-[#111827] text-2xl font-bold">{salon.name}</h4>
                  <p className="text-sm text-[#6B7280] mt-1 flex items-center gap-1">
                    <MapPin size={13} />
                    {salon.locality}, {salon.city}
                  </p>
                  {salon.address && (
                    <p className="text-xs text-[#9CA3AF] mt-0.5 ml-[18px]">{salon.address}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1">
                      <StarRating rating={salon.rating} />
                      <span className="text-sm font-semibold text-[#111827] ml-1">
                        {salon.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-[#9CA3AF]">({salon.reviews_count} reviews)</span>
                  </div>
                  {(salon.opening_time || salon.closing_time) && (
                    <div className="flex items-center gap-1.5 mt-3 text-sm text-green-600 font-medium">
                      <Clock size={14} />
                      {formatTimeRange(salon.opening_time, salon.closing_time)}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 - Select Services */}
              {step === 1 && (
                <div>
                  {servicesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={32} className="animate-spin text-[#EC4899]" />
                    </div>
                  ) : servicesError ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <AlertCircle size={32} className="text-red-400 mb-3" />
                      <p className="text-sm text-[#6B7280] mb-4">{servicesError}</p>
                      <button
                        onClick={fetchServices}
                        className="bg-[#EC4899] text-white rounded-xl px-5 py-2 text-sm font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <AlertCircle size={32} className="text-[#D1D5DB] mb-3" />
                      <p className="text-sm text-[#6B7280]">No services available for this salon</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {services.map((svc) => {
                          const selected = selectedServices.some((s) => s.id === svc.id);
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => toggleService(svc)}
                              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                                selected
                                  ? "border-[#EC4899] bg-[#EC4899]/5 ring-1 ring-[#EC4899]/30"
                                  : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-[#111827] text-sm">{svc.name}</h4>
                                  {svc.description && (
                                    <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">{svc.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-base font-bold text-[#EC4899]">
                                      ₹{svc.discounted_price || svc.price}
                                    </span>
                                    {svc.discounted_price && (
                                      <span className="text-xs text-[#9CA3AF] line-through">₹{svc.price}</span>
                                    )}
                                    {svc.duration_minutes && (
                                      <span className="text-xs text-[#9CA3AF]">
                                        {svc.duration_minutes} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                    selected
                                      ? "bg-[#EC4899] border-[#EC4899]"
                                      : "border-[#D1D5DB]"
                                  }`}
                                >
                                  {selected && <Check size={14} className="text-white" />}
                                </div>
                              </div>
                              {svc.discounted_price && (
                                <div className="mt-2">
                                  <span className="inline-block bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                    Save ₹{Number(svc.price) - Number(svc.discounted_price)}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedServices.length > 0 && (
                        <div className="mt-4 p-4 bg-[#FAFAFB] rounded-2xl border border-[#E5E7EB]/60">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#6B7280]">{selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected</span>
                            <span className="font-semibold text-[#111827]">
                              ₹{discountedSubtotal}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 2 - Select Date */}
              {step === 2 && (
                <div>
                  <BookingCalendar
                    currentMonth={calendarMonth}
                    availability={currentMonthData}
                    selectedDate={selectedDate}
                    onDateSelect={(date) => {
                      setSelectedSlot("");
                      setSelectedDate(date);
                    }}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                    canGoPrev={canGoPrevMonth}
                    loading={datesLoading}
                  />
                  {selectedDate && (
                    <div className="mt-4 p-3 bg-[#FAFAFB] rounded-2xl border border-[#E5E7EB]/60 flex items-center gap-2">
                      <Calendar size={16} className="text-[#EC4899]" />
                      <span className="text-sm text-[#111827] font-medium">
                        {formatDisplayDate(selectedDate)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 - Select Time */}
              {step === 3 && (
                <div>
                  {selectedDate && (
                    <div className="mb-4 p-3 bg-[#FAFAFB] rounded-2xl border border-[#E5E7EB]/60 flex items-center gap-2">
                      <Calendar size={16} className="text-[#EC4899]" />
                      <span className="text-sm text-[#111827] font-medium">
                        {formatDisplayDate(selectedDate)}
                      </span>
                    </div>
                  )}
                  {slotsLoading ? (
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-11 rounded-xl bg-[#F3F4F6] animate-pulse"
                        />
                      ))}
                    </div>
                  ) : availableSlots.filter((s) => s.available).length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Clock size={32} className="text-[#D1D5DB] mb-3" />
                      <p className="text-sm text-[#6B7280]">No available slots on this date</p>
                      <p className="text-xs text-[#9CA3AF] mt-1">Please select another date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((slot) => {
                        const booked = !slot.available;
                        const selected = selectedSlot === slot.time;
                        const past = slot.time < new Date().toTimeString().slice(0, 5) &&
                          selectedDate === new Date().toISOString().split("T")[0];
                        const disabled = booked || past;
                        return (
                          <button
                            key={slot.time}
                            disabled={disabled}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`rounded-xl py-2.5 text-sm font-medium border transition ${
                              disabled
                                ? booked
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                  : "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-200"
                                : selected
                                  ? "bg-[#EC4899] text-white border-[#EC4899] shadow-md shadow-[#EC4899]/20"
                                  : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer"
                            }`}
                          >
                            {booked ? "Booked" : past ? "Past" : formatDisplayTime(slot.time)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="mt-4 p-3 bg-[#FAFAFB] rounded-2xl border border-[#E5E7EB]/60 flex items-center gap-2">
                      <Clock size={16} className="text-[#EC4899]" />
                      <span className="text-sm text-[#111827] font-medium">
                        {formatDisplayTime(selectedSlot)} – {formatDisplayTime(endTime)}
                      </span>
                      <span className="text-xs text-[#9CA3AF] ml-auto">({totalDuration} min)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 - Customer Details */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                      Customer Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      className={`w-full rounded-xl border px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-all ${
                        errors.name
                          ? "border-red-300 bg-red-50"
                          : "border-[#E5E7EB] focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]/30"
                      }`}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Your phone number"
                      className={`w-full rounded-xl border px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-all ${
                        errors.phone
                          ? "border-red-300 bg-red-50"
                          : "border-[#E5E7EB] focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]/30"
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your@email.com"
                      className={`w-full rounded-xl border px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none transition-all ${
                        errors.email
                          ? "border-red-300 bg-red-50"
                          : "border-[#E5E7EB] focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]/30"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={10} />
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1">
                      Special Request <span className="text-[#9CA3AF] text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={specialRequest}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      placeholder="Any special requests..."
                      rows={3}
                      className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#EC4899] focus:ring-1 focus:ring-[#EC4899]/30 transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 5 - Booking Summary */}
              {step === 5 && (
                <div>
                  <div className="bg-[#FAFAFB] rounded-2xl p-5 border border-[#E5E7EB]/60 space-y-0 divide-y divide-[#E5E7EB]/40">
                    <div className="flex justify-between py-2 first:pt-0">
                      <span className="text-xs text-[#6B7280]">Salon</span>
                      <span className="text-sm text-[#111827] font-medium text-right">{salon.name}</span>
                    </div>
                    {salon.address && (
                      <div className="flex justify-between py-2">
                        <span className="text-xs text-[#6B7280]">Address</span>
                        <span className="text-sm text-[#111827] font-medium text-right max-w-[200px]">{salon.address}</span>
                      </div>
                    )}
                    <div className="py-2">
                      <span className="text-xs text-[#6B7280] block mb-2">Services</span>
                      <div className="space-y-1.5">
                        {selectedServices.map((s) => (
                          <div key={s.id} className="flex justify-between text-sm">
                            <span className="text-[#111827]">{s.name}</span>
                            <span className="font-semibold text-[#111827]">
                              ₹{s.discounted_price || s.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-[#6B7280]">Duration</span>
                      <span className="text-sm text-[#111827] font-medium">{totalDuration} min</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-[#6B7280]">Date & Time</span>
                      <span className="text-sm text-[#111827] font-medium">
                        {formatDisplayDate(selectedDate)}, {formatDisplayTime(selectedSlot)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#FAFAFB] rounded-2xl p-5 mt-4 border border-[#E5E7EB]/60 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Subtotal</span>
                      <span className="font-semibold text-[#111827]">₹{subtotal}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="font-semibold text-green-600">-₹{totalDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">Platform Fee (5%)</span>
                      <span className="font-semibold text-[#111827]">₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6B7280]">GST (12%)</span>
                      <span className="font-semibold text-[#111827]">₹{tax}</span>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-[#E5E7EB]/60">
                      <span className="font-bold text-[#111827]">Grand Total</span>
                      <span className="font-bold text-[#EC4899] text-lg">₹{grandTotal}</span>
                    </div>
                  </div>

                  {confirmError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-600">{confirmError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            {step < 6 && (
              <div className="px-6 pb-6 flex gap-3">
                {step > 0 ? (
                  <button
                    onClick={handleBack}
                    className="flex-1 border border-[#E5E7EB] text-[#6B7280] rounded-xl py-3.5 text-sm font-semibold hover:bg-[#FAFAFB] transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                ) : (
                  <div className="flex-1" />
                )}
                {step === 5 ? (
                  <button
                    onClick={handleConfirm}
                    disabled={confirmLoading}
                    className="flex-1 bg-[#EC4899] text-white rounded-xl py-3.5 text-sm font-bold hover:bg-[#DB2777] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {confirmLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Confirm Booking
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={canNext}
                    className="flex-1 bg-[#EC4899] text-white rounded-xl py-3.5 text-sm font-bold hover:bg-[#DB2777] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    {step === 0 ? "Continue" : "Next"}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 6 - Confirmation */}
        {step === 6 && (
          <div className="px-6 py-12 sm:py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] mx-auto flex items-center justify-center">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h3 className="font-display text-[#111827] text-2xl font-bold mt-6">
              Booking Confirmed!
            </h3>
            <p className="text-sm text-[#6B7280] mt-2">
              Your appointment has been booked successfully.
            </p>
            {bookingRef && (
              <div className="mt-4 inline-block bg-[#FAFAFB] rounded-xl px-5 py-2 border border-[#E5E7EB]/60">
                <span className="text-xs text-[#6B7280]">Reference</span>
                <p className="text-sm font-bold text-[#111827] tracking-wider">{bookingRef}</p>
              </div>
            )}
            <div className="mt-6 p-4 bg-[#FAFAFB] rounded-2xl border border-[#E5E7EB]/60 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} className="text-[#9CA3AF]" />
                <span className="text-[#111827] font-medium">{salon.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-[#9CA3AF]" />
                <span className="text-[#111827]">{formatDisplayDate(selectedDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-[#9CA3AF]" />
                <span className="text-[#111827]">
                  {formatDisplayTime(selectedSlot)} – {formatDisplayTime(endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard size={14} className="text-[#9CA3AF]" />
                <span className="text-[#111827]">₹{grandTotal} (Cash on arrival)</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link
                href="/bookings"
                className="inline-flex items-center gap-1.5 border border-[#E5E7EB] rounded-xl px-5 py-2.5 text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAFB] transition-all"
              >
                View Booking
              </Link>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 bg-[#EC4899] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#DB2777] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function BookingCalendar({
  currentMonth,
  availability,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  canGoPrev,
  loading,
}: {
  currentMonth: Date;
  availability: AvailableDate[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev: boolean;
  loading: boolean;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const grid = useMemo(() => getCalendarGrid(year, month), [year, month]);
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);

  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailableDate>();
    for (const a of availability) {
      map.set(a.date, a);
    }
    return map;
  }, [availability]);

  if (loading && availability.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]/40">
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] animate-pulse" />
          <div className="w-28 h-5 rounded-lg bg-[#F3F4F6] animate-pulse" />
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] animate-pulse" />
        </div>
        <div className="grid grid-cols-7 gap-1.5 p-5 pt-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-[#F3F4F6] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const noAvailability =
    !loading && availability.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 overflow-hidden shadow-sm transition-all">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB]/40">
        <button
          onClick={onPrevMonth}
          disabled={!canGoPrev}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-display text-lg font-bold text-[#111827] select-none">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          onClick={onNextMonth}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-all"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 px-5 pt-4 pb-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {noAvailability ? (
        <div className="flex flex-col items-center py-10 text-center px-5">
          <Calendar size={36} className="text-[#D1D5DB] mb-3" />
          <p className="text-sm font-medium text-[#6B7280]">No appointments available this month</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Try a different month</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5 px-4 pb-4">
          {grid.map((dayNum, idx) => {
            if (dayNum === null) return <div key={`e-${idx}`} className="aspect-square" />;

            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const isWeekend = new Date(year, month, dayNum).getDay() % 6 === 0;
            const avail = availabilityMap.get(dateStr);
            const isSelected = selectedDate === dateStr;

            let disabled = false;
            let cellClass = "flex flex-col items-center justify-center text-center transition-all rounded-xl ";
            let labelText = "";
            let indicator: "green" | "orange" | "red" | null = null;

            if (isPast) {
              disabled = true;
              cellClass += "opacity-25 cursor-not-allowed";
            } else if (!avail) {
              disabled = true;
              cellClass += "opacity-25 cursor-not-allowed";
            } else if (avail.reason === "Salon closed") {
              disabled = true;
              cellClass += "bg-red-50 text-red-400 cursor-not-allowed border border-red-200";
              labelText = "Closed";
            } else if (avail.reason === "Fully booked") {
              disabled = true;
              cellClass += "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed";
              labelText = "Full";
            } else if (isSelected) {
              cellClass += "bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-md shadow-[#EC4899]/20 scale-[1.02]";
            } else if (avail.available) {
              if (isToday) {
                cellClass += "border-2 border-[#EC4899] bg-white hover:bg-[#FFF0F7] cursor-pointer";
              } else {
                cellClass += "border-2 border-transparent bg-white hover:border-[#EC4899] hover:bg-[#FFF0F7] cursor-pointer";
              }
              const slots = avail.available_slots;
              if (slots > 5) indicator = "green";
              else if (slots > 0) indicator = "orange";
              else indicator = "red";
            } else {
              disabled = true;
              cellClass += "opacity-30 cursor-not-allowed";
            }

            if (!disabled && !isSelected && isWeekend && !isToday) {
              cellClass += " bg-[#FAFBFC]";
            }

            const showSlotsLabel = avail?.available && !isSelected && indicator && avail.available_slots > 0;

            return (
              <button
                key={dateStr}
                disabled={disabled}
                onClick={() => onDateSelect(dateStr)}
                className={cellClass}
                style={{ minHeight: "58px", padding: "4px 2px" }}
              >
                <span
                  className={`text-sm leading-none font-semibold ${
                    disabled ? "" : isSelected ? "text-white" : "text-[#111827]"
                  }`}
                >
                  {dayNum}
                </span>
                {isToday && !isSelected && (
                  <span className="text-[7px] font-bold text-[#EC4899] leading-none mt-1 uppercase tracking-wide">
                    Today
                  </span>
                )}
                {labelText && (
                  <span className={`text-[8px] font-medium leading-none mt-0.5 ${disabled ? "" : "text-[#9CA3AF]"}`}>
                    {labelText}
                  </span>
                )}
                {showSlotsLabel && (
                  <span className="text-[8px] font-medium text-[#9CA3AF] leading-none mt-0.5">
                    {avail.available_slots} slots
                  </span>
                )}
                {indicator && !isSelected && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      indicator === "green"
                        ? "bg-green-400"
                        : indicator === "orange"
                          ? "bg-orange-400"
                          : "bg-red-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
