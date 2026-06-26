"use client";

import { useEffect, useRef, useState } from "react";
import { userService } from "@/services/user.service";
import { uploadScanImage, analyzeScan } from "@/services/glamai.service";
import { SCAN_MESSAGES, MOCK_ANALYSIS, SALONS } from "@/data/glamai";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Upload, Lock, Camera, Check,
  MapPin, Scissors, Droplets, Shield, Heart,
  Download, Share2, ArrowRight,
} from "lucide-react";

/* ============= HOOKS ============= */

function useAnimatedScore(target: number, run: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) { setVal(0); return; }
    const dur = 1200;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(e * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return val;
}

/* ============= SHARED COMPONENTS ============= */

function ScoreRing({ score, run, size = 140 }: { score: number; run: boolean; size?: number }) {
  const val = useAnimatedScore(score, run);
  const r = (size - 10) / 2;
  const circ = r * 2 * Math.PI;
  const [show, setShow] = useState(false);
  useEffect(() => { if (run) setTimeout(() => setShow(true), 300); }, [run]);

  const strokeW = size > 100 ? 8 : size > 60 ? 6 : 4;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id={`scoreGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F9F0F6"
          strokeWidth={strokeW}
        />
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
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold leading-none"
          style={{
            fontSize: size > 100 ? 42 : size > 60 ? 26 : 18,
            background: "linear-gradient(135deg, #EC4899, #A855F7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {val}
        </span>
        <span
          className="text-gray-400 font-medium"
          style={{ fontSize: size > 100 ? 13 : size > 60 ? 9 : 7 }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, score, color, barColor, run, delay = 0 }: {
  icon: any;
  label: string;
  score: number;
  color: string;
  barColor: string;
  run: boolean;
  delay?: number;
}) {
  const val = useAnimatedScore(score, run);
  const statusLabel = val >= 90 ? "Excellent" : val >= 80 ? "Good" : val >= 70 ? "Fair" : "Needs Work";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={run ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -6, boxShadow: "0 20px 50px rgba(0,0,0,0.08)" }}
      className="rounded-[20px] bg-white border border-[#E5E7EB]/60 p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}12` }}
          >
            <Icon size={19} style={{ color }} />
          </div>
          <span className="text-sm font-semibold text-[#6B7280]">{label}</span>
        </div>
        <span className="text-[22px] font-bold" style={{ color }}>
          {val}
          <span className="text-xs font-medium opacity-40">%</span>
        </span>
      </div>
      <div className="h-[7px] rounded-full bg-[#F3F4F6] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${barColor}cc)` }}
          initial={{ width: 0 }}
          animate={run ? { width: `${val}%` } : {}}
          transition={{ duration: 1, delay: delay + 0.2, ease: "easeOut" }}
        />
      </div>
      <span
        className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full"
        style={{ background: `${color}10`, color }}
      >
        {statusLabel}
      </span>
    </motion.div>
  );
}

/* ============= PAGE ============= */

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

  /* ─── derived presentational data ─── */

  const strengths = MOCK_ANALYSIS.insights.filter((i) => i.status === "positive");
  const needsAttention = MOCK_ANALYSIS.insights.filter((i) => i.status !== "positive");

  const metrics = [
    { icon: Scissors, label: "Hair Health", score: MOCK_ANALYSIS.hair.score, color: "#EC4899", barColor: "#EC4899" },
    { icon: Heart, label: "Skin Health", score: MOCK_ANALYSIS.skin.score, color: "#8B5CF6", barColor: "#8B5CF6" },
    { icon: Shield, label: "Scalp Health", score: MOCK_ANALYSIS.scalp.score, color: "#10B981", barColor: "#10B981" },
    { icon: Droplets, label: "Hydration", score: MOCK_ANALYSIS.hydration.score, color: "#3B82F6", barColor: "#3B82F6" },
    { icon: Sparkles, label: "Beauty Score", score: MOCK_ANALYSIS.aiScore, color: "#F59E0B", barColor: "#F59E0B" },
    { icon: MapPin, label: "Salon Matches", score: Math.min(SALONS.length * 20, 100), color: "#EC4899", barColor: "#EC4899" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <CustomerNavbar />

      <main
        className="w-full mx-auto max-w-[1600px] px-8 pt-[112px] pb-8"
      >
        <div
          className="glamai-grid min-h-[calc(100vh-152px)]"
        >
          {/* ─── LEFT CARD — UPLOAD PANEL ─── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="bg-white rounded-3xl shadow-sm flex flex-col">
              {/* IDLE — Upload UI */}
              {showUpload && (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-7"
                    style={{
                      background: "linear-gradient(135deg, #FFF0F5 0%, #F3E8FF 100%)",
                      boxShadow: "0 4px 16px rgba(236,72,153,0.1)",
                    }}
                  >
                    <Sparkles size={28} style={{ color: "#EC4899" }} />
                  </motion.div>

                  {/* Heading */}
                  <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="font-display font-bold leading-[1.08] mb-4 text-5xl text-[#111827]"
                  >
                    Upload Your<br />Beauty Photo
                  </motion.h1>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                    className="mb-8 max-w-[320px] text-sm text-[#6B7280] leading-relaxed"
                  >
                    Get a complete AI-powered beauty report in under 10 seconds.
                  </motion.p>

                  {/* Feature Pills */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                    className="flex flex-wrap gap-2.5 justify-center mb-8"
                  >
                    {["Hair Analysis", "Skin Analysis", "Scalp Analysis", "Beauty Score"].map((item) => (
                      <div
                        key={item}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[#FFF0F5] border border-[#FBCFE8] text-[#DB2777]"
                      >
                        <Check size={12} className="text-[#EC4899]" />
                        {item}
                      </div>
                    ))}
                  </motion.div>

                  {/* Upload Area */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                    onClick={() => !quota?.allowed && !loading ? null : inputRef.current?.click()}
                    className={`w-full flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 rounded-3xl ${dragOver ? "bg-[#FFF0F5]" : "bg-[#FFFBFC]"}`}
                    style={{
                      height: 380,
                      border: dragOver ? "2px dashed #EC4899" : "2px dashed #FBCFE8",
                    }}
                  >
                    <div className={dragOver ? "scale-105 transition-transform duration-200" : ""}>
                      <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-5 bg-[#FFF0F5]">
                        <Upload size={26} className="text-[#EC4899]" />
                      </div>
                      <h3 className="font-bold mb-2 text-lg text-[#111827]">
                        Choose Photo
                      </h3>
                      <p className="mb-6 text-sm text-[#9CA3AF]">
                        Drag & Drop or browse files
                      </p>

                      {!quota?.allowed && !loading ? (
                        <div className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full text-xs font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]">
                          <Lock size={13} /> Upgrade to continue
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white text-sm font-semibold transition-all duration-300 hover:scale-105"
                          style={{
                            background: "linear-gradient(135deg, #EC4899, #F472B6)",
                            boxShadow: "0 8px 32px rgba(236,72,153,0.3)",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(236,72,153,0.4)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(236,72,153,0.3)"; }}
                        >
                          <Upload size={15} />
                          Choose Photo
                        </button>
                      )}

                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      />
                    </div>
                  </motion.div>

                  {/* Helper text */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                    className="mt-5 text-xs text-[#9CA3AF]"
                  >
                    PNG &bull; JPG &bull; WEBP &nbsp;&middot;&nbsp; Maximum size: 10 MB
                  </motion.p>
                </div>
              )}

              {/* PROCESSING — Uploading / Scanning */}
              {showProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center px-8"
                >
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#EC4899] border-r-[#A855F7] animate-spin" />
                    <div className="absolute inset-3 rounded-full flex items-center justify-center bg-white shadow-lg">
                      <Sparkles size={26} className="text-[#EC4899]" />
                    </div>
                  </div>
                  <p className="font-semibold mb-2 text-base text-[#374151]">
                    {state === "uploading" ? "Uploading your photo..." : "Analyzing your beauty..."}
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={msgIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm text-[#9CA3AF]"
                    >
                      {SCAN_MESSAGES[msgIdx]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              )}

              {/* DONE — Preview with result */}
              {showDone && (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
                  <div className="relative w-full overflow-hidden mb-6 rounded-3xl shadow-lg">
                    <img
                      src={preview!}
                      alt="Your photo"
                      className="w-full object-cover h-[280px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <div className="px-3.5 py-1.5 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 bg-[#10B981] shadow-[0_4px_16px_rgba(16,185,129,0.3)]">
                        <Check size={12} />
                        Analysis Complete
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold mb-5 text-base text-[#374151]">
                    Your beauty scan is ready!
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-semibold transition-all duration-300 bg-[#111827] hover:scale-105"
                  >
                    <Camera size={14} />
                    New Analysis
                  </button>
                </div>
              )}

              {/* ERROR state */}
              {showError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-center px-8"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-[#FEF2F2]">
                    <Camera size={26} className="text-[#F87171]" />
                  </div>
                  <p className="font-semibold mb-1 text-base text-[#374151]">
                    Analysis Failed
                  </p>
                  <p className="mb-6 max-w-[260px] text-sm text-[#9CA3AF] leading-relaxed">
                    {error}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white text-sm font-semibold transition-all duration-300 bg-[#111827] shadow-md hover:scale-105"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}

              {/* Privacy card — only when idle */}
              {showUpload && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                  className="mx-8 mb-8 flex items-start gap-3.5 p-5 rounded-2xl bg-[#FFFBFC] border border-[#FFF0F5]"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#FFF0F5]">
                    <Lock size={17} className="text-[#EC4899]" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1 text-sm text-[#374151]">
                      Secure & Private
                    </h4>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      Your images are encrypted, used only for analysis and never permanently stored.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ─── RIGHT CARD — REPORT DASHBOARD ─── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="min-w-0"
          >
            <div className="bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[calc(100vh-152px)] p-8">
              {!isDone ? (
                /* ═══ EMPTY STATE ═══ */
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-20 h-20 rounded-[24px] flex items-center justify-center mb-7"
                    style={{
                      background: "linear-gradient(135deg, #FFF0F5 0%, #F3E8FF 100%)",
                      boxShadow: "0 4px 20px rgba(236,72,153,0.1)",
                    }}
                  >
                    <Sparkles size={32} className="text-[#EC4899]" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                    className="font-display font-bold mb-3 text-3xl text-[#111827]"
                  >
                    Your AI Beauty Report
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                    className="max-w-[400px] mb-10 text-sm text-[#6B7280] leading-relaxed"
                  >
                    Detailed AI analysis and personalized recommendations.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                    className="grid grid-cols-3 gap-3 w-full max-w-[440px]"
                  >
                    {[
                      { label: "Hair Health", color: "#EC4899", bg: "#FFF0F5" },
                      { label: "Skin Health", color: "#8B5CF6", bg: "#F3E8FF" },
                      { label: "Scalp Health", color: "#10B981", bg: "#ECFDF5" },
                      { label: "Hydration", color: "#3B82F6", bg: "#EFF6FF" },
                      { label: "Beauty Score", color: "#F59E0B", bg: "#FFFBEB" },
                      { label: "Salon Matches", color: "#EC4899", bg: "#FFF0F5" },
                    ].map((item, i) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 0.5, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.25 + i * 0.05 }}
                        className="rounded-[20px] p-4 text-center bg-[#FAFAFA] border border-[#F3F4F6]"
                      >
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2.5"
                          style={{ background: item.bg }}
                        >
                          <Sparkles size={16} style={{ color: item.color }} />
                        </div>
                        <p className="text-xs font-medium text-[#9CA3AF]">{item.label}</p>
                        <p className="text-sm font-bold text-[#D1D5DB] mt-0.5">--%</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ) : (
                /* ═══ FULL REPORT ═══ */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* ── Header ── */}
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex items-center justify-between mb-8 shrink-0"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FFF0F5]">
                        <Sparkles size={21} className="text-[#EC4899]" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-xl text-[#111827]">
                          Your AI Beauty Report
                        </h2>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          Detailed AI analysis and personalized recommendations.
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 bg-green-50 border border-green-200 text-green-700">
                      <Check size={13} />
                      Analysis Complete
                    </div>
                  </motion.div>

                  {/* ── Scrollable report body ── */}
                  <div className="flex-1 overflow-y-auto hide-scrollbar space-y-6 pr-1">

                    {/* Beauty Score Hero */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                      className="flex items-center gap-8 rounded-[28px] p-8 bg-gradient-to-br from-[#FFF7FA] via-[#FCE7F3] to-[#FFF5F9]"
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <ScoreRing score={MOCK_ANALYSIS.aiScore} run size={140} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold mb-2 text-[26px] text-[#111827]">
                          Overall Beauty Score
                        </h3>
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="text-[22px] font-bold bg-gradient-to-r from-[#EC4899] to-[#A855F7] bg-clip-text text-transparent"
                          >
                            {MOCK_ANALYSIS.overallLabel}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFF0F5] text-[#DB2777]">
                            Top 8%
                          </span>
                        </div>
                        <p className="text-sm text-[#6B7280] leading-relaxed max-w-[420px]">
                          {MOCK_ANALYSIS.overallDesc}
                        </p>
                      </div>
                    </motion.div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {metrics.map((m, i) => (
                        <MetricCard
                          key={m.label}
                          icon={m.icon}
                          label={m.label}
                          score={m.score}
                          color={m.color}
                          barColor={m.barColor}
                          run
                          delay={0.15 + i * 0.06}
                        />
                      ))}
                    </div>

                    {/* AI Insights */}
                    <div>
                      <h4 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles size={13} className="text-[#EC4899]" />
                        AI Insights
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <motion.div
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35, duration: 0.5 }}
                          className="rounded-[20px] p-6 bg-green-50 border border-green-200"
                        >
                          <h5 className="font-bold mb-4 flex items-center gap-2 text-sm text-[#065F46]">
                            <Check size={15} className="text-[#10B981]" />
                            Your Strengths
                          </h5>
                          <div className="space-y-3">
                            {strengths.map((insight, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#D1FAE5]">
                                  <Check size={10} className="text-[#10B981]" />
                                </div>
                                <span className="text-sm text-[#374151] leading-relaxed">
                                  {insight.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>

                        {/* Needs Attention */}
                        <motion.div
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                          className="rounded-[20px] p-6 bg-amber-50 border border-amber-200"
                        >
                          <h5 className="font-bold mb-4 flex items-center gap-2 text-sm text-[#92400E]">
                            <span className="text-[#F59E0B] text-lg leading-none">&bull;</span>
                            Needs Attention
                          </h5>
                          <div className="space-y-3">
                            {needsAttention.map((insight, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <span className="shrink-0 mt-0.5 text-[#F59E0B] text-lg leading-none">
                                  &bull;
                                </span>
                                <span className="text-sm text-[#374151] leading-relaxed">
                                  {insight.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="grid grid-cols-3 gap-4 pt-2 pb-4"
                    >
                      <button className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#FAFAFB] hover:text-[#111827] hover:scale-105">
                        <Download size={15} />
                        Download Report
                      </button>
                      <button className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#FAFAFB] hover:text-[#111827] hover:scale-105">
                        <Share2 size={15} />
                        Share Report
                      </button>
                      <button className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-full text-white text-sm font-semibold transition-all duration-300 hover:scale-105"
                        style={{
                          background: "linear-gradient(135deg, #EC4899, #F472B6)",
                          boxShadow: "0 8px 32px rgba(236,72,153,0.25)",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(236,72,153,0.35)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(236,72,153,0.25)"; }}
                      >
                        Book Recommended Salon
                        <ArrowRight size={14} />
                      </button>
                    </motion.div>

                  </div>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
