"use client";

import { useEffect, useRef, useState } from "react";
import { userService } from "@/services/user.service";
import { uploadScanImage, analyzeScan } from "@/services/glamai.service";
import { SCAN_MESSAGES, MOCK_ANALYSIS, PRODUCTS, SALONS } from "@/data/glamai";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Upload, Lock, Camera, Check,
  Star, MapPin, ShoppingBag, Scissors, Droplets, Shield, Heart,
  Scan, SmilePlus,
} from "lucide-react";

function useAnimatedScore(target: number, run: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) { setVal(0); return; }
    const dur = 1000;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(e * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return val;
}

function ScoreRing({ score, run, size = 64 }: { score: number; run: boolean; size?: number }) {
  const val = useAnimatedScore(score, run);
  const r = (size - 8) / 2;
  const circ = r * 2 * Math.PI;
  const [show, setShow] = useState(false);
  useEffect(() => { if (run) setTimeout(() => setShow(true), 200); }, [run]);

  const strokeW = size > 80 ? 6 : size > 50 ? 4 : 3;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id={`scoreGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3E8FF" strokeWidth={strokeW} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#scoreGrad_${size})`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={show ? { strokeDashoffset: circ - (val / 100) * circ } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-purple-600 leading-none ${size > 80 ? "text-[26px]" : size > 50 ? "text-[18px]" : "text-[13px]"}`}>{val}</span>
        <span className={`text-gray-400 font-medium ${size > 80 ? "text-[9px]" : size > 50 ? "text-[7px]" : "text-[5px]"}`}>%</span>
      </div>
    </div>
  );
}

function MiniChart({ color, height = 30 }: { color: string; height?: number }) {
  return (
    <div className="flex items-end gap-[3px] flex-1" style={{ height }}>
      {[40, 65, 50, 80, 70, 90, 75, 95, 85, 100].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${h}%`,
            background: `${color}${i > 6 ? "" : "40"}`,
          }}
        />
      ))}
    </div>
  );
}

function HeroFaceScan() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(145deg, #FFF5F9 0%, #FCE7F3 35%, #FDF2F8 65%, #F3E8FF 100%)" }}
      />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-pink-200/20 blur-3xl" />
      <div className="absolute -bottom-24 right-0 w-80 h-80 rounded-full bg-purple-200/15 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pink-100/10 blur-3xl" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <motion.img
              src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80&auto=format&fit=crop"
              alt="AI Beauty Scan"
              className="w-[240px] h-[240px] rounded-full object-cover"
              style={{
                boxShadow: "0 0 80px rgba(236,72,153,0.25), 0 0 160px rgba(168,85,247,0.1), 0 20px 60px rgba(0,0,0,0.08)",
              }}
            />
          </motion.div>

          <motion.div
            className="absolute inset-[-16px] rounded-full border-[2px] border-pink-300/30"
            animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-[-32px] rounded-full border-[1.5px] border-pink-200/15"
            animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute inset-[-48px] rounded-full border-[1px] border-purple-200/10"
            animate={{ scale: [1, 1.03, 1], opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <motion.div
            className="absolute left-[-24px] right-[-24px] h-[1.5px] bg-gradient-to-r from-transparent via-pink-400/50 to-transparent"
            animate={{ top: ["18%", "82%", "18%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute -top-3 -right-3 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/60">
            <Sparkles size={18} className="text-pink-500" />
          </div>
          <div className="absolute -bottom-2 -left-3 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/60">
            <Scan size={18} className="text-purple-500" />
          </div>
          <div className="absolute top-1/3 -right-6 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/60">
            <div className="w-3 h-3 rounded-full bg-emerald-400" style={{ animation: "pulse 2s ease-in-out infinite" }} />
          </div>
          <div className="absolute bottom-1/3 -left-6 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/60">
            <div className="w-3 h-3 rounded-full bg-pink-400" style={{ animation: "pulse 2s ease-in-out infinite 0.5s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPanelFeatureCard({ item, index }: {
  item: { label: string; desc: string; icon: any; color: string; bg: string };
  index: number;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 + index * 0.06 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}
      className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-white/75 backdrop-blur-sm border border-white/70 shadow-sm hover:shadow-xl hover:border-pink-200/30 transition-all duration-300"
      style={{ height: "140px" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: item.bg }}>
        <Icon size={20} style={{ color: item.color }} />
      </div>
      <div>
        <h4 className="text-[15px] font-bold text-gray-900 leading-tight">{item.label}</h4>
        <p className="text-[12px] text-gray-400 leading-snug mt-0.5">{item.desc}</p>
      </div>
    </motion.div>
  );
}

function RightPanelPreviewCard({ item, index }: {
  item: { label: string; icon: any; score: number; color: string; badge: string };
  index: number;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
      className="relative rounded-[24px] bg-white/70 backdrop-blur-md border border-white/80 shadow-sm overflow-hidden"
      style={{ height: "180px" }}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color}15` }}>
              <Icon size={17} style={{ color: item.color }} />
            </div>
            <span className="text-[13px] font-bold text-gray-800">{item.label}</span>
          </div>
          <span className="text-[11px] font-bold" style={{ color: item.color }}>{item.score}%</span>
        </div>
        <div className="flex-1 flex items-end">
          {item.label === "Beauty Score" ? (
            <div className="flex items-center gap-3 w-full">
              <ScoreRing score={item.score} run={false} size={56} />
              <div className="flex-1 h-2 rounded-full bg-gray-100/80 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-500" style={{ width: `${item.score}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <MiniChart color={item.color} height={36} />
              <span className="text-[10px] font-medium text-gray-400 px-2 py-1 rounded-full bg-gray-50 border border-gray-100 whitespace-nowrap">{item.badge}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  const features = [
    { label: "Hair Analysis", desc: "Deep hair health & structure analysis", icon: Scissors, color: "#EC4899", bg: "#FCE7F3" },
    { label: "Skin Analysis", desc: "Advanced skin clarity & texture report", icon: SmilePlus, color: "#A855F7", bg: "#F3E8FF" },
    { label: "Beauty Score", desc: "AI-evaluated overall beauty metric", icon: Sparkles, color: "#10B981", bg: "#D1FAE5" },
    { label: "Product Recs", desc: "Custom products for your routine", icon: ShoppingBag, color: "#F59E0B", bg: "#FEF3C7" },
    { label: "Salon Recs", desc: "Best salons & treatments near you", icon: MapPin, color: "#3B82F6", bg: "#DBEAFE" },
    { label: "Scalp Health", desc: "Scalp condition & hair root analysis", icon: Shield, color: "#EC4899", bg: "#FCE7F3" },
  ];

  const previewItems = [
    { label: "Beauty Score", icon: Sparkles, score: 92, color: "#F59E0B", badge: "Excellent" },
    { label: "Hair Health", icon: Scissors, score: 90, color: "#EC4899", badge: "Healthy" },
    { label: "Skin Health", icon: SmilePlus, score: 94, color: "#A855F7", badge: "Radiant" },
    { label: "Scalp Health", icon: Shield, score: 85, color: "#10B981", badge: "Good" },
    { label: "Recommendations", icon: ShoppingBag, score: 96, color: "#F59E0B", badge: "4 Products" },
    { label: "Salon Matches", icon: MapPin, score: 92, color: "#3B82F6", badge: "5 Near You" },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto hide-scrollbar">
      <div className="shrink-0">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-16 h-16 mb-5"
        >
          <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-pink-400 to-purple-500 rotate-6 opacity-80 blur-sm" />
          <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-pink-300 to-purple-400 -rotate-3 opacity-60" />
          <div className="absolute inset-0 rounded-[20px] bg-white flex items-center justify-center shadow-2xl shadow-pink-200/40 border border-white/60">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
              <Sparkles size={24} className="text-pink-500" />
            </div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-3 rounded-[24px] border-[1.5px] border-pink-200/30"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="font-display text-[40px] md:text-[52px] font-bold text-gray-900 leading-[1.08] mb-3"
        >
          Upload your beauty photo
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-[14px] md:text-[15px] text-gray-400 leading-relaxed max-w-[480px] mb-8"
        >
          Receive a complete AI-powered beauty report with personalized recommendations.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {features.map((item, i) => (
          <RightPanelFeatureCard key={item.label} item={item} index={i} />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="relative mb-4"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em]">What You'll Receive</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>

        <div className="relative">
          <div className="grid grid-cols-3 gap-4 blur-[3px] opacity-40 pointer-events-none select-none">
            {previewItems.map((item, i) => (
              <RightPanelPreviewCard key={item.label} item={item} index={i} />
            ))}
          </div>

          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white/40 backdrop-blur-xl rounded-2xl px-8 py-6 shadow-[0_16px_48px_rgba(0,0,0,0.08)] border border-white/60 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center shadow-sm">
                <Lock size={20} className="text-pink-500" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold text-gray-800">Unlock after uploading your photo</p>
                <p className="text-[12px] text-gray-400 mt-1">Get your complete AI analysis & recommendations</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onUploadClick(); }}
                className="mt-1 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
              >
                <Upload size={14} />
                Upload Photo
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function GlamAIPage() {
  const [quota, setQuota] = useState<{ allowed: boolean; scansUsed: number; scansLimit: number | null; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userService.getScanQuota().then(setQuota).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (state !== "scanning" && state !== "uploading") return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, [state]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setState("uploading");
      setMsgIdx(0);
      const base64 = dataUrl.split(",")[1] ?? "";
      const mediaType = file.type || "image/jpeg";
      try {
        const uploadResult = await uploadScanImage(base64, mediaType);
        setState("scanning");
        const analyzeResult = await analyzeScan(uploadResult.scanId, uploadResult.imageUrl);
        setState("done");
      } catch (e: any) {
        setError(e?.message ?? "Could not analyze photo. Please try a clearer image in good lighting.");
        setState("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setState("idle");
    setPreview(null);
    setError(null);
  };

  const isDone = state === "done";
  const showUpload = state === "idle" && !error;
  const showProcessing = (state === "uploading" || state === "scanning") && preview;
  const showDone = state === "done" && preview;
  const showError = state === "error";

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardNavbar />

      <main className="w-full max-w-[1800px] mx-auto px-6 md:px-8 pt-[104px] pb-8">
        <div className="flex flex-col lg:flex-row gap-6" style={{ minHeight: "calc(100vh - 136px)" }}>
          {/* ===== LEFT PANEL 40% ===== */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full lg:w-[40%] shrink-0"
          >
            <div
              className="bg-white/85 backdrop-blur-sm rounded-[32px] overflow-hidden flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-white/40"
              style={{ height: "calc(100vh - 136px)" }}
            >
              {/* Hero Image */}
              <div className="relative h-[300px] shrink-0 overflow-hidden">
                {showUpload && <HeroFaceScan />}
                {showProcessing && (
                  <div className="relative w-full h-full overflow-hidden bg-gray-900">
                    <img src={preview!} alt="Upload" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative w-14 h-14 mx-auto mb-3">
                          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-pink-400 border-r-purple-400 spin-ring" />
                          <div className="absolute inset-1 rounded-full bg-white/90 flex items-center justify-center">
                            <Sparkles size={18} className="text-pink-500" />
                          </div>
                        </div>
                        <p className="text-white text-[13px] font-semibold drop-shadow">
                          {state === "uploading" ? "Uploading..." : "Analyzing..."}
                        </p>
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={msgIdx}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="text-white/70 text-[11px] mt-1 drop-shadow"
                          >
                            {SCAN_MESSAGES[msgIdx]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}
                {showDone && (
                  <div className="relative w-full h-full overflow-hidden">
                    <img src={preview!} alt="Your photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <div className="px-3 py-1.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-sm border border-white/20">
                        <Check size={11} />
                        Analysis Complete
                      </div>
                    </div>
                  </div>
                )}
                {showError && (
                  <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                        <Camera size={22} className="text-red-300" />
                      </div>
                      <p className="text-gray-800 text-[12px] font-semibold mb-0.5">Analysis Failed</p>
                      <p className="text-gray-400 text-[11px] mb-4 max-w-[220px] mx-auto">{error}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="bg-gray-900 text-white rounded-full px-5 py-2 text-[12px] font-semibold hover:bg-gray-800 transition-all shadow-md"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Body */}
              <div
                className="flex-1 px-8 pb-8 pt-6 flex flex-col"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onClick={() => state === "idle" && !error && inputRef.current?.click()}
              >
                {showUpload && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                  >
                    <motion.h2
                      animate={dragOver ? { scale: 1.02 } : { scale: 1 }}
                      className="font-display text-[42px] font-bold text-gray-900 leading-[1.1] mb-3"
                    >
                      Upload Your Beauty Photo
                    </motion.h2>

                    <p className="text-[14px] text-gray-400 max-w-[280px] mx-auto leading-relaxed mb-6">
                      Get a complete AI-powered beauty analysis in seconds.
                    </p>

                    <div className="w-full max-w-[320px] space-y-3 mb-6">
                      {[
                        "Hair Health Analysis",
                        "Skin Health Analysis",
                        "Scalp Analysis",
                        "Beauty Score",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center">
                            <Check size={10} className="text-pink-500" />
                          </div>
                          <span className="text-[13px] font-medium text-gray-700">{item}</span>
                        </div>
                      ))}
                    </div>

                    {!quota?.allowed && !loading ? (
                      <div className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[12px] font-medium">
                        <Lock size={13} /> Upgrade to continue
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                          className="flex items-center justify-center gap-2.5 w-full max-w-[320px] rounded-full bg-gray-900 text-white text-[15px] font-semibold hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.18)]"
                          style={{ height: "60px" }}
                        >
                          <Upload size={17} />
                          Choose Photo
                        </button>
                        <input
                          ref={inputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                        <p className="text-[12px] text-gray-300 mt-3">or drag & drop your image</p>
                      </>
                    )}
                  </motion.div>
                )}

                {showProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                  >
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-pink-400 border-r-purple-400 spin-ring" />
                      <div className="absolute inset-1.5 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <Sparkles size={20} className="text-pink-500" />
                      </div>
                    </div>
                    <p className="text-gray-800 text-[13px] font-semibold mb-1">
                      {state === "uploading" ? "Uploading..." : "Analyzing..."}
                    </p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={msgIdx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-gray-400 text-[11px]"
                      >
                        {SCAN_MESSAGES[msgIdx]}
                      </motion.p>
                    </AnimatePresence>
                  </motion.div>
                )}

                {showDone && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                      <Check size={22} className="text-emerald-500" />
                    </div>
                    <p className="text-gray-800 text-[13px] font-semibold mb-3">Analysis Complete!</p>
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors px-4 py-2 rounded-full border border-gray-200"
                      >
                        New analysis
                      </button>
                    </div>
                  </motion.div>
                )}

                {showError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-3">
                      <Camera size={22} className="text-red-300" />
                    </div>
                    <p className="text-gray-800 text-[13px] font-semibold mb-0.5">Analysis Failed</p>
                    <p className="text-gray-400 text-[11px] mb-4 max-w-[220px]">{error}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="bg-gray-900 text-white rounded-full px-5 py-2 text-[12px] font-semibold hover:bg-gray-800 transition-all shadow-md"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}

                {/* Security Card */}
                {showUpload && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 p-5 rounded-[24px] flex items-start gap-3 bg-pink-50/80 border border-pink-100/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                      <Lock size={15} className="text-pink-500" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-gray-800 mb-1">Secure & Private</h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Your photos are encrypted and used only for AI analysis. We never share or store your images permanently.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ===== RIGHT PANEL 60% ===== */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex-1 min-w-0"
          >
            <div
              className="rounded-[32px] overflow-hidden"
              style={{
                height: "calc(100vh - 136px)",
                background: "linear-gradient(180deg, #FFF5F9 0%, #FCE7F3 100%)",
              }}
            >
              <div className="h-full p-8 md:p-10">
                {!isDone ? (
                  <EmptyState onUploadClick={triggerUpload} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-6 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-white/60 flex items-center justify-center">
                        <Sparkles size={18} className="text-pink-500" />
                      </div>
                      <div>
                        <h3 className="font-display text-[20px] font-bold text-gray-900">AI Beauty Report</h3>
                        <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                          <Check size={10} /> Analysis complete
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto hide-scrollbar pr-1">
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative rounded-2xl overflow-hidden p-6 bg-white/80 backdrop-blur-sm border border-white/70 shadow-sm"
                      >
                        <div className="relative z-10 flex items-center gap-6">
                          <ScoreRing score={MOCK_ANALYSIS.aiScore} run size={120} />
                          <div className="flex-1">
                            <h4 className="font-display text-[24px] font-bold text-gray-900">{MOCK_ANALYSIS.overallLabel}</h4>
                            <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">{MOCK_ANALYSIS.overallDesc}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {MOCK_ANALYSIS.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-medium text-emerald-600"
                                >
                                  <Check size={9} /> {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <div className="grid grid-cols-2 gap-3">
                        <AnalysisCard icon={Scissors} label="Hair Health" score={MOCK_ANALYSIS.hair.score} color="#EC4899" barColor="#EC4899" run delay={0.15} />
                        <AnalysisCard icon={Heart} label="Skin Health" score={MOCK_ANALYSIS.skin.score} color="#A855F7" barColor="#A855F7" run delay={0.2} />
                        <AnalysisCard icon={Shield} label="Scalp Health" score={MOCK_ANALYSIS.scalp.score} color="#10B981" barColor="#10B981" run delay={0.25} />
                        <AnalysisCard icon={Droplets} label="Hydration Level" score={MOCK_ANALYSIS.hydration.score} color="#3B82F6" barColor="#3B82F6" run delay={0.3} />
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-pink-400" /> AI Insights
                        </h4>
                        <div className="space-y-2">
                          {MOCK_ANALYSIS.insights.map((insight, i) => (
                            <InsightCard key={i} {...insight} delay={0.4 + i * 0.06} />
                          ))}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <ShoppingBag size={12} className="text-pink-400" /> Product Recommendations
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {PRODUCTS.map((product) => (
                            <ProductCard key={product.id} product={product} delay={0.55 + product.id * 0.08} />
                          ))}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                      >
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <MapPin size={12} className="text-pink-400" /> Salon Recommendations
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {SALONS.map((salon) => (
                            <SalonCard key={salon.id} salon={salon} delay={0.7 + salon.id * 0.08} />
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function AnalysisCard({
  icon: Icon,
  label,
  score,
  color,
  barColor,
  run,
  delay = 0,
}: {
  icon: any;
  label: string;
  score: number;
  color: string;
  barColor: string;
  run: boolean;
  delay?: number;
}) {
  const val = useAnimatedScore(score, run);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={run ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/70 p-4 hover:shadow-lg hover:shadow-pink-200/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-[13px] font-semibold text-gray-800">{label}</span>
        </div>
        <span className="text-[18px] font-bold" style={{ color }}>{val}<span className="text-[9px] font-medium opacity-50">%</span></span>
      </div>
      <div className="h-2 rounded-full bg-gray-100/80 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={run ? { width: `${val}%` } : {}}
          transition={{ duration: 0.6, delay: delay + 0.15, ease: "easeOut" }}
        />
      </div>
      <span
        className="inline-block mt-2 text-[10px] font-medium px-2.5 py-0.5 rounded-full"
        style={{ background: `${color}12`, color }}
      >
        {val >= 90 ? "Excellent" : val >= 80 ? "Good" : "Fair"}
      </span>
    </motion.div>
  );
}

function InsightCard({ text, status, delay }: { text: string; status: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50 hover:bg-white/80 transition-colors"
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${status === "positive" ? "bg-emerald-100" : "bg-amber-100"}`}>
        {status === "positive" ? (
          <Check size={10} className="text-emerald-500" />
        ) : (
          <span className="text-[10px] text-amber-500 font-bold">!</span>
        )}
      </div>
      <span className="text-[13px] text-gray-600 leading-snug">{text}</span>
    </motion.div>
  );
}

function ProductCard({ product, delay }: { product: typeof PRODUCTS[0]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/80 backdrop-blur-sm border border-white/70 hover:border-pink-100 hover:shadow-md transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-50 shadow-sm">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-[12px] font-semibold text-gray-800 truncate">{product.name}</h5>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{product.reason}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden max-w-[60px]">
            <div className="h-full rounded-full" style={{ width: `${product.score}%`, background: "linear-gradient(90deg, #EC4899, #A855F7)" }} />
          </div>
          <span className="text-[9px] font-semibold text-gray-400">{product.score}%</span>
        </div>
      </div>
      <button className="shrink-0 text-[10px] font-semibold text-white px-3 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors whitespace-nowrap">
        View
      </button>
    </motion.div>
  );
}

function SalonCard({ salon, delay }: { salon: typeof SALONS[0]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-xl bg-white/80 backdrop-blur-sm border border-white/70 overflow-hidden hover:shadow-lg hover:shadow-pink-200/15 transition-all duration-300"
    >
      <div className="h-28 overflow-hidden relative">
        <img src={salon.image} alt={salon.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-amber-600">
            <Star size={9} fill="currentColor" /> {salon.rating}
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] text-gray-500">
            <MapPin size={9} /> {salon.distance}
          </div>
        </div>
      </div>
      <div className="p-3">
        <h5 className="text-[12px] font-semibold text-gray-800">{salon.name}</h5>
        <p className="text-[10px] text-gray-400 mt-0.5">{salon.treatment}</p>
        <button className="mt-2 w-full text-[10px] font-semibold text-pink-500 border border-pink-200 rounded-full py-1.5 hover:bg-pink-50 transition-colors">
          Book Now
        </button>
      </div>
    </motion.div>
  );
}
