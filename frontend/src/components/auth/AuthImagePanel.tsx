import { Store, Sparkles, CalendarDays, Star } from "lucide-react";

interface AuthImagePanelProps {
  imageUrl: string;
  activeDot?: number;
}

const features = [
  { icon: Store, title: "Discover Top Salons", sub: "Handpicked & Verified" },
  { icon: Sparkles, title: "AI-Powered Beauty Insights", sub: "Personalized recommendations" },
  { icon: CalendarDays, title: "Easy Booking", sub: "Book in seconds, hassle-free" },
  { icon: Star, title: "Trusted by Thousands", sub: "Real reviews from real clients" },
];

export function AuthImagePanel({ imageUrl, activeDot = 0 }: AuthImagePanelProps) {
  return (
    <div className="hidden lg:flex relative flex-1 rounded-r-2xl overflow-hidden">
      <img
        src={imageUrl}
        alt="Salon"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(236,72,153,0.25) 50%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col justify-end p-8 pb-10">
        <h2 className="font-display font-bold text-white text-[28px] leading-[1.15] mb-5">
          Mumbai&apos;s #1
          <br />
          Salon Platform
        </h2>
        <div className="space-y-3.5">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <f.icon size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white text-[12.5px] font-semibold leading-tight">{f.title}</p>
                <p className="text-white/65 text-[10.5px] leading-tight mt-0.5">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`w-[7px] h-[7px] rounded-full transition-colors ${
                i === activeDot ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
