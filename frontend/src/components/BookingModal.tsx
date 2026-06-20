import { useMemo, useState } from "react";
import {
  X,
  Check,
  Star,
  User,
  Calendar,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import { SALONS } from "@/data/salons";
import { BOOKING_SERVICES, BOOKING_STYLISTS, TIME_SLOTS, BOOKED_SLOTS } from "@/data/booking";

export function BookingModal({
  salon,
  onClose,
}: {
  salon?: (typeof SALONS)[number];
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<string[]>([]);
  const [stylist, setStylist] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const days = useMemo(() => {
    const arr: { label: string; sub: string; key: string }[] = [];
    const d = new Date();
    const dnames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < 7; i++) {
      const nd = new Date(d);
      nd.setDate(d.getDate() + i);
      arr.push({
        label: i === 0 ? "Today" : dnames[nd.getDay()],
        sub: String(nd.getDate()),
        key: nd.toISOString().slice(0, 10),
      });
    }
    return arr;
  }, []);

  const canNext =
    step === 0
      ? services.length > 0
      : step === 1
        ? !!stylist
        : step === 2
          ? !!date && !!time
          : true;
  const labels = ["Service", "Stylist", "Date & Time", "Confirm"];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="modal-in bg-white rounded-[28px] max-w-[520px] w-full p-8 md:p-10 max-h-[90vh] overflow-y-auto relative"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#333] hover:text-[#111] transition"
        >
          <X size={20} />
        </button>

        {!done ? (
          <>
            <h3 className="font-display text-[#111] text-[26px] md:text-[28px]">
              Book Your Appointment
            </h3>
            <p className="text-[#999] italic text-[14px] mt-1">
              {salon?.name ?? "Mumbai's finest salons"}
            </p>

            <div className="flex items-center gap-2 mt-6">
              {labels.map((l, i) => (
                <div key={l} className="flex-1 flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                        i < step
                          ? "bg-[#F5C842] text-[#111]"
                          : i === step
                            ? "bg-[#111] text-white"
                            : "border border-[#E8E8E8] text-[#999]"
                      }`}
                    >
                      {i < step ? <Check size={12} /> : i + 1}
                    </div>
                    <span className="text-[10px] text-[#999]">{l}</span>
                  </div>
                  {i < labels.length - 1 && <div className="flex-1 h-px bg-[#E8E8E8] -mt-4" />}
                </div>
              ))}
            </div>

            <div className="mt-8">
              {step === 0 && (
                <>
                  <p className="text-[#111] text-[16px] font-semibold mb-4">What would you like?</p>
                  <div className="flex flex-wrap gap-2">
                    {BOOKING_SERVICES.map((s) => {
                      const on = services.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setServices((arr) => (on ? arr.filter((x) => x !== s) : [...arr, s]))
                          }
                          className={`rounded-full px-4 py-2 text-[13px] transition ${on ? "bg-[#111] text-white border border-[#111]" : "border border-[#E8E8E8] text-[#333] hover:border-[#111]"}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <p className="text-[#111] text-[16px] font-semibold mb-4">Pick your stylist</p>
                  <div className="grid grid-cols-3 gap-3">
                    {BOOKING_STYLISTS.map((s) => {
                      const on = stylist === s.name;
                      return (
                        <button
                          key={s.name}
                          onClick={() => setStylist(s.name)}
                          className={`bg-[#F8F8F8] rounded-2xl p-4 text-center transition ${on ? "border-[#F5C842] border-2" : "border border-[#E8E8E8]"}`}
                        >
                          <User size={24} className="mx-auto text-[#666]" />
                          <p className="text-[#111] text-[13px] font-semibold mt-2">{s.name}</p>
                          <p className="text-[#999] text-[11px]">{s.spec}</p>
                          <p className="text-[#F5C842] text-[11px] mt-1 flex items-center justify-center gap-0.5">
                            <Star size={10} fill="#F5C842" color="#F5C842" /> {s.rating}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-[#111] text-[16px] font-semibold mb-4">Pick date &amp; time</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {days.map((d) => {
                      const on = date === d.key;
                      return (
                        <button
                          key={d.key}
                          onClick={() => setDate(d.key)}
                          className={`flex-shrink-0 rounded-xl border px-3 py-2 text-center transition ${on ? "bg-[#111] text-white border-[#111]" : "border-[#E8E8E8] text-[#333] bg-[#F8F8F8]"}`}
                        >
                          <p className="text-[11px]">{d.label}</p>
                          <p className="text-[16px] font-semibold">{d.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {TIME_SLOTS.map((t) => {
                      const booked = BOOKED_SLOTS.has(t);
                      const on = time === t;
                      return (
                        <button
                          key={t}
                          disabled={booked}
                          onClick={() => setTime(t)}
                          className={`rounded-xl p-3 text-[12px] border transition ${
                            booked
                              ? "bg-[#F8F8F8] text-[#ccc] border-[#E8E8E8] cursor-not-allowed"
                              : on
                                ? "bg-[#111] text-white border-[#111]"
                                : "border-[#E8E8E8] text-[#333] bg-[#F8F8F8] hover:border-[#111]"
                          }`}
                        >
                          {booked ? "Booked" : t}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-2xl p-6">
                    {[
                      ["Salon", salon?.name ?? "GlamSpot Partner"],
                      ["Services", services.join(", ") || "—"],
                      ["Stylist", stylist ?? "—"],
                      ["Date", date ?? "—"],
                      ["Time", time ?? "—"],
                      ["Price", salon ? `₹${salon.priceMin} – ₹${salon.priceMax}` : "₹500 – ₹2000"],
                    ].map(([k, v], i) => (
                      <div
                        key={k as string}
                        className={`flex justify-between py-3 ${i > 0 ? "border-t border-[#E8E8E8]" : ""}`}
                      >
                        <span className="text-[#999] text-[13px]">{k}</span>
                        <span className="text-[#111] text-[14px] text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setDone(true)}
                    className="w-full bg-[#111] text-white rounded-full py-4 font-bold text-[15px] mt-6 hover:bg-[#333] transition"
                  >
                    Confirm Booking
                  </button>
                </>
              )}
            </div>

            {step < 3 && (
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="border border-[#E8E8E8] text-[#333] rounded-full px-6 py-3 disabled:opacity-30"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="bg-[#111] text-white rounded-full px-6 py-3 font-semibold disabled:opacity-40"
                >
                  Next <ArrowRight size={14} className="inline" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#FFF9E6] border border-[#F5C842] mx-auto flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <path
                  className="draw-check"
                  d="M10 21 L18 29 L31 13"
                  fill="none"
                  stroke="#F5C842"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-display text-[#111] text-[28px] mt-6">Booking Confirmed!</h3>
            <p className="text-[#999] text-[14px] mt-2">
              See you at {salon?.name ?? "your salon"} on {date ?? "the chosen day"} at{" "}
              {time ?? "your slot"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button className="border border-[#E8E8E8] text-[#333] rounded-full px-5 py-2.5 flex items-center gap-1.5">
                <Calendar size={14} /> Add to Calendar
              </button>
              <button
                onClick={onClose}
                className="border border-[#E8E8E8] text-[#333] rounded-full px-5 py-2.5 flex items-center gap-1.5"
              >
                <Bookmark size={14} /> View Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
