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
        scrolled ? "bg-white/90 backdrop-blur-xl border-[#E8E8E8]" : "bg-white border-[#E8E8E8]"
      }`}
      style={{ boxShadow: scrolled ? "0 1px 12px rgba(0,0,0,0.06)" : "none" }}
    >
      <div className="flex items-center justify-between px-6 md:px-[60px] py-5">
        <a href="#top" className="font-display font-bold text-[#111] text-2xl tracking-tight">
          GlamSpot
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.l}
              href={l.h}
              className="text-[#333] hover:text-[#F5C842] text-[14px] transition-all duration-200 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#F5C842] after:transition-all after:duration-200 hover:after:w-full"
            >
              {l.l}
            </a>
          ))}
          <button
            onClick={onBook}
            className="text-[#333] hover:text-[#F5C842] text-[14px] transition-all duration-200 relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#F5C842] after:transition-all after:duration-200 hover:after:w-full"
          >
            Book Now
          </button>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <span className="border border-[#E8E8E8] rounded-full px-4 py-2 text-[13px] text-[#333] flex items-center gap-1.5">
            <MapPin size={14} /> Mumbai
          </span>
          <Link
            href="/signin"
            className="bg-[#111] text-white rounded-full px-5 py-2 text-[13px] font-semibold hover:bg-[#333] transition"
          >
            Sign In
          </Link>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="md:hidden text-[#111]">
          <Menu size={24} />
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-[#E8E8E8] px-6 py-6 space-y-4">
          {links.map((l) => (
            <a
              key={l.l}
              href={l.h}
              onClick={() => setOpen(false)}
              className="block text-[#333] text-base"
            >
              {l.l}
            </a>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onBook();
            }}
            className="block text-[#333] text-base"
          >
            Book Now
          </button>
          <Link
            href="/signin"
            className="w-full bg-[#111] text-white rounded-full py-3 font-semibold text-center block"
          >
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
}
