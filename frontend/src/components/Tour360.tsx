import { useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { TOUR_SALONS } from "@/data/tour-salons";

export function Tour360() {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [pan, setPan] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const cur = TOUR_SALONS[idx];

  return (
    <section className="bg-[#FFF5F8] text-[#111] py-24 px-6 md:px-[60px]">
      <h2 className="font-display text-center text-[#111] text-4xl md:text-5xl">
        Step Inside Before You Book
      </h2>
      <p className="text-center text-[#666] text-[16px] mt-3">
        Explore salon interiors with our immersive 360 virtual tour
      </p>

      <div
        ref={viewerRef}
        className="relative w-full h-[460px] rounded-3xl overflow-hidden mt-12 select-none"
        style={{ cursor: drag ? "grabbing" : "grab" }}
        onMouseDown={(e) => {
          setDrag(true);
          startX.current = e.clientX;
        }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
        onMouseMove={(e) => {
          if (drag && viewerRef.current) {
            const rect = viewerRef.current.getBoundingClientRect();
            const offsetX = (e.clientX - startX.current) * 0.15;
            setPan(offsetX);
          }
        }}
      >
        <img
          src={cur.image}
          alt={cur.name}
          className="absolute inset-0 w-[110%] h-full object-cover transition-none"
          style={{
            transform: `translateX(${pan}px)`,
            backgroundPosition: `${50 + pan / 4}% 50%`,
          }}
          draggable={false}
        />
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/30 font-display" style={{ fontSize: 200 }}>
            360
          </span>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <RotateCw size={56} className="text-white" />
          <span className="text-white text-[12px] tracking-[0.3em] mt-2 uppercase">
            {drag ? "Exploring..." : "Drag to Explore"}
          </span>
        </div>
        <div className="absolute bottom-6 left-6 pointer-events-none">
          <p className="font-display text-white text-2xl">
            {cur.name}, {cur.loc}
          </p>
          <p className="text-[#bbb] text-[13px] mt-1">Click and drag to look around</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {TOUR_SALONS.map((t, i) => (
          <button
            key={t.name}
            onClick={() => {
              setIdx(i);
              setPan(0);
            }}
            className="relative rounded-xl overflow-hidden transition-all"
            style={{
              width: 200,
              height: 110,
              border: `3px solid ${idx === i ? "#F5C842" : "transparent"}`,
            }}
          >
            <img
              src={t.image}
              alt={t.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-left">
              <p className="font-display text-white text-[14px] leading-tight">{t.name}</p>
              <p className="text-[#bbb] text-[11px]">{t.loc}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
