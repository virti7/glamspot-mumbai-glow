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
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="modal-in bg-white rounded-3xl max-w-[520px] w-full p-8 max-h-[90vh] overflow-y-auto relative shadow-2xl border border-[#E5E7EB]/40"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition-all flex items-center justify-center"
        >
          <X size={20} />
        </button>

        {!done ? (
          <>
            <h3 className="font-display text-[#111827] text-2xl font-bold">
              Book Your Appointment
            </h3>
            <p className="text-sm text-[#6B7280] mt-1">
              {salon?.name ?? "Mumbai's finest salons"}
            </p>

            <div className="flex gap-2 mt-6">
              {labels.map((l, i) => (
                <div key={l} className="flex-1 flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        i < step
                          ? "bg-[#EC4899] text-white"
                          : i === step
                            ? "bg-[#111827] text-white ring-2 ring-[#EC4899]/30"
                            : "border border-[#E5E7EB] text-[#9CA3AF]"
                      }`}
                    >
                      {i < step ? <Check size={12} /> : i + 1}
                    </div>
                    <span className="text-[10px] text-[#9CA3AF]">{l}</span>
                  </div>
                  {i < labels.length - 1 && <div className="flex-1 h-px bg-[#E5E7EB] -mt-4" />}
                </div>
              ))}
            </div>

            <div className="mt-8">
              {step === 0 && (
                <>
                  <p className="text-[#111827] text-sm font-semibold mb-4">What would you like?</p>
                  <div className="flex flex-wrap gap-2">
                    {BOOKING_SERVICES.map((s) => {
                      const on = services.includes(s);
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setServices((arr) => (on ? arr.filter((x) => x !== s) : [...arr, s]))
                          }
                          className={`rounded-xl px-4 py-2 text-sm transition ${on ? "bg-[#111827] text-white border border-[#111827]" : "border border-[#E5E7EB] text-[#6B7280] hover:border-[#111827]"}`}
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
                  <p className="text-[#111827] text-sm font-semibold mb-4">Pick your stylist</p>
                  <div className="grid grid-cols-3 gap-3">
                    {BOOKING_STYLISTS.map((s) => {
                      const on = stylist === s.name;
                      return (
                        <button
                          key={s.name}
                          onClick={() => setStylist(s.name)}
                          className={`bg-[#FAFAFB] rounded-2xl p-4 text-center border border-[#E5E7EB] hover:border-[#EC4899] transition-all cursor-pointer ${on ? "border-2 border-[#EC4899] bg-[#EC4899]/5" : ""}`}
                        >
                          <User size={24} className="mx-auto text-[#6B7280]" />
                          <p className="text-[#111827] text-[13px] font-semibold mt-2">{s.name}</p>
                          <p className="text-[#9CA3AF] text-[11px]">{s.spec}</p>
                          <p className="text-[#EC4899] text-[11px] mt-1 flex items-center justify-center gap-0.5">
                            <Star size={10} fill="#EC4899" color="#EC4899" /> {s.rating}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <p className="text-[#111827] text-sm font-semibold mb-4">Pick date &amp; time</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {days.map((d) => {
                      const on = date === d.key;
                      return (
                        <button
                          key={d.key}
                          onClick={() => setDate(d.key)}
                          className={`flex-shrink-0 rounded-xl border px-4 py-3 text-center transition-all ${on ? "bg-[#111827] text-white border-[#111827]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#111827]"}`}
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
                          className={`rounded-xl py-3 text-sm border transition ${
                            booked
                              ? "bg-[#FAFAFB] text-[#D1D5DB] cursor-not-allowed border-[#E5E7EB]"
                              : on
                                ? "bg-[#111827] text-white border-[#111827]"
                                : "border-[#E5E7EB] text-[#6B7280] hover:border-[#111827]"
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
                  <div className="bg-[#FAFAFB] border border-[#E5E7EB]/60 rounded-2xl p-5">
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
                        className={`flex justify-between py-3 border-b border-[#E5E7EB]/40 ${i === 5 ? "border-b-0" : ""}`}
                      >
                        <span className="text-xs text-[#6B7280]">{k}</span>
                        <span className="text-sm text-[#111827] font-medium text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setDone(true)}
                    className="w-full bg-[#EC4899] text-white rounded-xl py-4 text-sm font-bold hover:bg-[#DB2777] transition-all mt-6"
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
                  className="border border-[#E5E7EB] text-[#6B7280] rounded-xl px-6 py-3 text-sm hover:bg-[#FAFAFB] transition-all disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext}
                  className="bg-[#EC4899] text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-[#DB2777] transition-all disabled:opacity-40"
                >
                  Next <ArrowRight size={14} className="inline" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] mx-auto flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <path
                  className="draw-check"
                  d="M10 21 L18 29 L31 13"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-display text-[#111827] text-2xl mt-6">Booking Confirmed!</h3>
            <p className="text-sm text-[#6B7280] mt-2">
              See you at {salon?.name ?? "your salon"} on {date ?? "the chosen day"} at{" "}
              {time ?? "your slot"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button className="border border-[#E5E7EB] rounded-xl px-5 py-2.5 text-sm text-[#6B7280] hover:bg-[#FAFAFB] flex items-center gap-1.5">
                <Calendar size={14} /> Add to Calendar
              </button>
              <button
                onClick={onClose}
                className="border border-[#E5E7EB] rounded-xl px-5 py-2.5 text-sm text-[#6B7280] hover:bg-[#FAFAFB] flex items-center gap-1.5"
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
