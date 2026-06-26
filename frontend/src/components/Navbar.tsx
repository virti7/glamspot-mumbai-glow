import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Menu } from "lucide-react";

export function Navbar({ onBook }: { onBook: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 80);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const links = [
    { l: "Discover", h: "#discover" },
    { l: "Services", h: "#what-we-do" },
    { l: "AI Diagnosis", h: "#glamai" },
    { l: "Our Team", h: "#team" },
  ];
  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 border-b ${
        scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-[#E5E7EB]/60" : "bg-white border-[#E5E7EB]/60"
      }`}
    >
      <div className="flex items-center justify-between px-6 md:px-[60px] py-4">
        <a href="#top" className="font-display font-bold text-[#111827] text-xl tracking-tight">
          GlamSpot
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.l}
              href={l.h}
className="text-[#6B7280] hover:text-[#111827] text-sm font-medium transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#EC4899] after:transition-all after:duration-200 hover:after:w-full"
            >
              {l.l}
            </a>
          ))}
          <button
            onClick={onBook}
            className="bg-[#EC4899] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25"
          >
            Book Now
          </button>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <span className="border border-[#E5E7EB] rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 text-[#6B7280]">
            <MapPin size={14} /> Mumbai
          </span>
          <Link
            href="/signin"
            className="bg-[#111827] text-white rounded-xl px-5 py-2.5 text-xs font-semibold hover:bg-[#1F2937] transition"
          >
            Sign In
          </Link>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="md:hidden text-[#111827]">
          <Menu size={24} />
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-[#E5E7EB]/60 px-6 py-6 space-y-4">
          {links.map((l) => (
            <a
              key={l.l}
              href={l.h}
              onClick={() => setOpen(false)}
              className="block text-[#6B7280] text-sm font-medium hover:text-[#111827]"
            >
              {l.l}
            </a>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onBook();
            }}
            className="w-full bg-[#EC4899] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#DB2777] transition-all text-center"
          >
            Book Now
          </button>
          <Link
            href="/signin"
            className="w-full bg-[#111827] text-white rounded-xl py-3 text-sm font-semibold text-center block hover:bg-[#1F2937] transition"
          >
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
}
