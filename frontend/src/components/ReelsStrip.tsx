import { useEffect, useState } from "react";
import { Sparkles, Instagram, Heart, MessageCircle, Send, ArrowRight } from "lucide-react";
import { REELS } from "@/data/reels";

async function fetchInstagramReels(accessToken: string) {
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption&access_token=${accessToken}`,
    );
    const data = await res.json();
    return (
      data.data?.filter(
        (item: { media_type: string }) => item.media_type === "VIDEO" || item.media_type === "REEL",
      ) || []
    );
  } catch {
    return null;
  }
}

async function fetchReelsData() {
  const INSTAGRAM_TOKEN = "YOUR_TOKEN_HERE";
  if (INSTAGRAM_TOKEN !== "YOUR_TOKEN_HERE") {
    const data = await fetchInstagramReels(INSTAGRAM_TOKEN);
    if (data && data.length > 0) return data;
  }
  return null;
}

export function ReelsStrip() {
  const [reels, setReels] = useState(REELS);

  useEffect(() => {
    fetchReelsData().then((data) => {
      if (data && data.length > 0) {
        setReels(
          data.map(
            (item: { thumbnail_url: string; caption: string; permalink: string; id: string }) => ({
              svc: item.caption?.split("\n")[0] || "Salon Reel",
              salon: "Mumbai Salon",
              username: "@glamspotmumbai",
              image: item.thumbnail_url,
              likes: String(Math.floor(Math.random() * 10000)),
              comments: Math.floor(Math.random() * 500),
              link: item.permalink,
            }),
          ),
        );
      }
    });
  }, []);

  return (
    <section className="bg-[#FAFAFB] py-[60px]">
      <div className="text-center px-6">
        <h2 className="font-display text-[#111] text-3xl md:text-[36px] mb-3">
          Live From Mumbai Salons
        </h2>
        <p className="text-[#666] text-[14px] mb-10">Real transformations happening right now</p>
      </div>

      <div className="overflow-hidden">
        <div className="flex gap-4 w-max scroll-left">
          {[...reels, ...reels].map((r, i) => (
            <ReelCard key={`a${i}`} r={r} />
          ))}
        </div>
      </div>

      <div className="text-center mt-6">
        <span className="text-[#666] text-[13px] inline-flex items-center gap-2">
          <Sparkles size={14} /> Follow us @glamspotmumbai <Instagram size={14} />
        </span>
      </div>
    </section>
  );
}

function ReelCard({
  r,
}: {
  r: {
    svc: string;
    salon: string;
    username: string;
    image: string;
    likes: string;
    comments: number;
  };
}) {
  return (
    <div
      className="relative group rounded-[16px] overflow-hidden flex-shrink-0 cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
      style={{ width: 160, height: 290 }}
    >
      <img src={r.image} alt={r.svc} className="absolute inset-0 w-full h-full object-cover" />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(transparent 50%, rgba(0,0,0,0.7))" }}
      />

      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <div className="w-[24px] h-[24px] rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] flex items-center justify-center overflow-hidden border border-white/30">
          <img src={r.image} alt="" className="w-full h-full object-cover" />
        </div>
        <span className="text-white text-[10px] font-semibold">{r.username}</span>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <Instagram size={16} className="text-white" />
      </div>

      <div className="absolute right-2 bottom-20 flex flex-col gap-3 text-white items-center">
        <div className="flex flex-col items-center gap-0.5">
          <Heart size={16} />
          <span className="text-white text-[10px]">{r.likes}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle size={16} />
          <span className="text-white text-[10px]">{r.comments}</span>
        </div>
        <Send size={16} />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-semibold text-white text-[14px] leading-tight">{r.svc}</p>
        <p className="text-[#ddd] text-[11px] mt-0.5">{r.salon}</p>
      </div>

      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
        <span className="bg-white text-[#111] rounded-full px-3 py-1 text-[12px] font-semibold">
          Book This Look <ArrowRight size={12} className="inline" />
        </span>
      </div>
    </div>
  );
}
