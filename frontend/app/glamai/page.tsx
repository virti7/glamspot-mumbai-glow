"use client";

import { useEffect, useRef, useState } from "react";
import { userService } from "@/services/user.service";
import { uploadScanImage, analyzeScan } from "@/services/glamai.service";
import { SCAN_MESSAGES, type ScanResult } from "@/data/glamai";
import { DashboardNavbar } from "@/components/dashboard/DashboardNavbar";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Upload, Lock, Camera, Check, Zap,
  Scissors, Droplets, Shield, Heart, X, Star, ChevronRight,
  Sun,
} from "lucide-react";

type Tab = "overview" | "hair" | "skin" | "recommendations";

const MOCK_ANALYSIS = {
  aiScore: 92,
  overallLabel: "Excellent Overall Condition",
  overallDesc:
    "Your comprehensive analysis reveals excellent hair and skin health. Your current routine is working well, and with a few targeted enhancements, you can achieve even better results for a radiant glow.",
  tags: ["Healthy Hair", "Clear Skin", "Well Balanced"],
  recommendation:
    "Continue with your current hair care routine and keep your skin hydrated. We recommend a weekly deep conditioning treatment for even better results.",
  hair: {
    score: 90,
    metrics: [
      { label: "Scalp Condition", score: 85, status: "Good" },
      { label: "Hair Strength", score: 88, status: "Strong" },
      { label: "Hair Growth", score: 95, status: "Excellent" },
      { label: "Overall Health", score: 90, status: "Good" },
    ],
  },
  skin: {
    score: 94,
    metrics: [
      { label: "Skin Texture", score: 92, status: "Smooth" },
      { label: "Hydration Level", score: 96, status: "High" },
      { label: "Skin Clarity", score: 93, status: "Excellent" },
      { label: "Overall Health", score: 94, status: "Excellent" },
    ],
  },
  recommendations: [
    {
      title: "Hair Routine",
      desc: "Use a sulfate-free shampoo 3x per week and deep condition weekly for optimal moisture and strength.",
      icon: Scissors,
      color: "#EC4899",
    },
    {
      title: "Skin Hydration",
      desc: "Apply a hyaluronic acid serum morning and evening for optimal moisture retention and plumpness.",
      icon: Droplets,
      color: "#A855F7",
    },
    {
      title: "Protection",
      desc: "Always use SPF 30+ sunscreen to protect your skin from UV damage and premature aging.",
      icon: Shield,
      color: "#22C55E",
    },
    {
      title: "Nourishment",
      desc: "Include biotin-rich foods and omega-3 fatty acids in your diet for healthy hair and glowing skin.",
      icon: Heart,
      color: "#F59E0B",
    },
  ],
};

const tabVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

function ProgressRing({ score, size = 100, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const timer = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(timer);
    };
    requestAnimationFrame(timer);
  }, [score]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#pinkGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (animatedScore / 100) * circumference }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold text-pink-500 leading-none">{animatedScore}%</span>
        {size > 80 && <span className="text-[9px] text-gray-400 mt-0.5">Score</span>}
      </div>
    </div>
  );
}

function ScoreBar({ label, score, color = "#EC4899" }: { label: string; score: number; color?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-gray-500">{label}</span>
        <span className="text-[12px] font-semibold text-gray-700">{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function GlamAIPage() {
  const [quota, setQuota] = useState<{ allowed: boolean; scansUsed: number; scansLimit: number | null; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scoreAnim, setScoreAnim] = useState(0);

  useEffect(() => {
    userService
      .getScanQuota()
      .then(setQuota)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (state !== "scanning" && state !== "uploading") return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length), 1500);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (state === "done") {
      const duration = 800;
      const startTime = Date.now();
      const timer = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setScoreAnim(Math.round(eased * MOCK_ANALYSIS.aiScore));
        if (progress < 1) requestAnimationFrame(timer);
      };
      requestAnimationFrame(timer);
    }
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
        setResult(analyzeResult.result);
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
    setResult(null);
    setError(null);
    setScoreAnim(0);
    setActiveTab("overview");
  };

  const isDone = state === "done";

  return (
    <div className="min-h-screen bg-[#FAF8F6]">
      <DashboardNavbar />

      <main className="w-full max-w-none px-4 lg:px-6 pt-[100px] pb-14 space-y-6">
        {/* ===== HERO BANNER ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[28px] h-[220px]"
          style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFFFFF 100%)" }}
        >
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />
          <div className="absolute -bottom-16 right-1/4 w-56 h-56 rounded-full bg-rose-200/20 blur-3xl" />

          <div className="relative z-10 flex items-center h-full px-8 lg:px-12">
            <div className="flex-1 z-20">
              <h1 className="font-display text-[38px] lg:text-[42px] font-bold text-[#111] leading-tight mb-1">
                GlamAI <span>✨</span>
              </h1>
              <p className="text-[15px] text-gray-500 font-medium mb-5">
                AI-powered hair &amp; skin diagnosis
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { label: "Accurate Analysis", emoji: "🎯" },
                  { label: "Personalized", emoji: "👤" },
                  { label: "Smart Recommendations", emoji: "✨" },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-full px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  >
                    <span className="text-[12px]">{pill.emoji}</span>
                    <span className="text-[11px] font-semibold text-[#111]">{pill.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[45%] z-0">
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#FCE7F3]/20 to-[#FFF7FA] z-10" />
              <img
                src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=80&auto=format&fit=crop"
                alt="Beauty"
                className="w-full h-full object-cover"
              />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-8 right-20 w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center z-20"
              >
                <Scissors size={18} className="text-[#EC4899]" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute bottom-14 right-12 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center z-20"
              >
                <Droplets size={16} className="text-[#A855F7]" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-1/3 right-36 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-lg flex items-center justify-center z-20"
              >
                <Sparkles size={14} className="text-[#F59E0B]" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ===== TWO COLUMN LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[38%_62%] gap-6" style={{ minHeight: "800px" }}>
          {/* ========== LEFT COLUMN ========== */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-4 h-full"
          >
            <div
              className="bg-white rounded-[24px] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-full"
              style={{ minHeight: "800px" }}
            >
              <div className="px-6 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
                    <Camera size={15} className="text-[#EC4899]" />
                  </div>
                  <h3 className="font-semibold text-[#111] text-[15px]">Your Photo</h3>
                </div>
              </div>

              <div
                className="flex-1 p-6"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                onClick={() => state === "idle" && inputRef.current?.click()}
              >
                {state === "idle" && !error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`h-full border-2 border-dashed rounded-[20px] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                      dragOver
                        ? "border-pink-400 bg-pink-50"
                        : "border-[#F9A8D4] bg-[#FFF9FB] hover:border-pink-300 hover:bg-[#FFF0F5]"
                    }`}
                  >
                    <motion.div
                      animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
                      className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4"
                    >
                      <Upload size={24} className="text-[#EC4899]" />
                    </motion.div>
                    <h4 className="font-display text-[19px] font-bold text-[#111] mb-2">
                      {dragOver ? "Drop it here" : "Upload Your Photo"}
                    </h4>
                    <p className="text-gray-400 text-[12px] mb-6 max-w-[260px] mx-auto leading-relaxed">
                      Take a clear photo of your hair or skin for AI-powered analysis and personalized recommendations.
                    </p>
                    {!quota?.allowed && !loading ? (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px]">
                        <Lock size={13} />
                        Scan limit reached. Upgrade to continue.
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className="inline-flex items-center justify-center gap-2 px-8 rounded-full bg-[#111] text-white text-[14px] font-semibold hover:bg-[#333] hover:scale-105 transition-all duration-300 shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
                        style={{ height: "52px", width: "200px" }}
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
                    <p className="text-[11px] text-gray-300 mt-4">or drag and drop your image here</p>
                  </motion.div>
                )}

                {(state === "uploading" || state === "scanning") && preview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col"
                    style={{ minHeight: "380px" }}
                  >
                    <div className="relative flex-1 rounded-[20px] overflow-hidden bg-gray-50">
                      <img src={preview} alt="Upload" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="text-center">
                          <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full spin-ring" style={{ border: "3px solid transparent", borderTopColor: "#EC4899", borderRightColor: "#F472B6" }} />
                            <div className="absolute inset-0 rounded-full overflow-hidden">
                              <div className="scan-line absolute left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #EC4899, transparent)" }} />
                            </div>
                            <div className="absolute inset-2 rounded-full bg-white/90 flex items-center justify-center">
                              <Sparkles size={20} className="text-[#EC4899]" />
                            </div>
                          </div>
                          <p className="text-white text-[14px] font-semibold drop-shadow-lg">
                            {state === "uploading" ? "Uploading..." : "Analyzing..."}
                          </p>
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={msgIdx}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="text-white/70 text-[12px] mt-1 drop-shadow"
                            >
                              {SCAN_MESSAGES[msgIdx]}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {state === "done" && preview && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col"
                    style={{ minHeight: "380px" }}
                  >
                    <div className="relative flex-1 rounded-[16px] overflow-hidden bg-gray-50">
                      <img src={preview} alt="Your photo" className="w-full h-full object-cover" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-lg">
                          <Check size={12} />
                          Analyzed
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={14} />
                        Remove
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="text-[12px] text-[#EC4899] font-semibold hover:text-pink-600 transition-colors"
                      >
                        Analyze new photo
                      </button>
                    </div>
                  </motion.div>
                )}

                {state === "error" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center"
                    style={{ minHeight: "380px" }}
                  >
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                      <Camera size={24} className="text-red-300" />
                    </div>
                    <p className="text-[#111] text-[13px] font-semibold mb-1">Analysis Failed</p>
                    <p className="text-gray-400 text-[12px] mb-5 max-w-[240px] text-center">{error}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="bg-[#111] text-white rounded-full px-6 py-2.5 text-[13px] font-semibold hover:bg-[#333] transition-all shadow-lg"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ========== RIGHT COLUMN ========== */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-[24px] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-full"
            style={{ minHeight: "800px" }}
          >
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
                  <Sparkles size={15} className="text-[#EC4899]" />
                </div>
                <h3 className="font-semibold text-[#111] text-[15px]">Your AI Analysis</h3>
              </div>
              {isDone ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="flex items-center gap-1.5 bg-[#FCE7F3] rounded-full px-4 py-1.5 border border-pink-100"
                >
                  <span className="text-[11px] text-gray-500 font-medium">AI Score</span>
                  <span className="text-[22px] font-bold text-[#EC4899] leading-none">
                    {scoreAnim}
                  </span>
                  <span className="text-[11px] text-gray-300 font-medium">/100</span>
                </motion.div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-full px-3.5 py-1.5 border border-gray-100">
                  <span className="text-[11px] text-gray-400 font-medium">Awaiting photo</span>
                </div>
              )}
            </div>

            {isDone && (
              <div className="px-6 border-b border-gray-50">
                <div className="flex gap-0">
                  {(["overview", "hair", "skin", "recommendations"] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-5 py-3 text-[13px] font-medium transition-colors ${
                        activeTab === tab ? "text-[#EC4899]" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {tab === "overview" && "Overview"}
                      {tab === "hair" && "Hair Analysis"}
                      {tab === "skin" && "Skin Analysis"}
                      {tab === "recommendations" && "Recommendations"}
                      {activeTab === tab && (
                        <motion.span
                          layoutId="tabIndicator"
                          className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#EC4899]"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 p-6 overflow-auto">
              {!isDone ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col h-full text-center"
                >
                  <div className="relative rounded-[20px] overflow-hidden p-8 mb-6" style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFF0F5 100%)" }}>
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-pink-200/30 blur-3xl" />
                    <div className="absolute -bottom-10 left-1/4 w-32 h-32 rounded-full bg-rose-200/20 blur-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-[28px]">✨</span>
                        <h4 className="font-display text-[22px] font-bold text-[#111]">
                          AI Beauty Analysis
                        </h4>
                      </div>
                      <p className="text-[13px] text-gray-500 mb-4">
                        Upload a photo to receive your personalized beauty report
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["Hair Analysis", "Skin Analysis", "Beauty Score", "Product Recs", "Salon Recs"].map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-[11px] font-medium text-gray-600 shadow-sm"
                          >
                            <Check size={10} className="text-pink-400" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-[20px] p-6 mb-6">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Example Preview</div>
                    <div className="flex items-start gap-6">
                      <div className="relative shrink-0">
                        <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                          <span className="text-[36px] font-bold text-pink-400">92</span>
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-pink-200/50" />
                      </div>
                      <div className="flex-1 text-left space-y-3">
                        <div>
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="text-gray-500">Hair Health</span>
                            <span className="font-semibold text-pink-500">90%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-400 rounded-full" style={{ width: "90%" }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="text-gray-500">Skin Health</span>
                            <span className="font-semibold text-purple-500">94%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-400 rounded-full" style={{ width: "94%" }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="text-gray-500">Overall Score</span>
                            <span className="font-semibold text-emerald-500">92%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: "92%" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-center gap-3 text-[12px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                          <Camera size={11} className="text-pink-500" />
                        </div>
                        <span>Upload Photo</span>
                      </div>
                      <ChevronRight size={12} className="text-gray-300" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                          <Sparkles size={11} className="text-purple-500" />
                        </div>
                        <span>AI Analysis</span>
                      </div>
                      <ChevronRight size={12} className="text-gray-300" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                          <Star size={11} className="text-amber-500" />
                        </div>
                        <span>Get Results</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div
                      key="overview"
                      variants={tabVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="flex items-start gap-6 p-5 rounded-[20px] border border-gray-100 bg-gradient-to-br from-white to-pink-50/30">
                        <ProgressRing score={MOCK_ANALYSIS.aiScore} size={120} strokeWidth={10} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[16px] text-[#111] mb-1">
                            {MOCK_ANALYSIS.overallLabel}
                          </h4>
                          <p className="text-[12px] text-gray-400 leading-relaxed mb-3">
                            {MOCK_ANALYSIS.overallDesc}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {MOCK_ANALYSIS.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-600"
                              >
                                <Check size={10} className="text-emerald-500" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <motion.div
                          whileHover={{ y: -2 }}
                          className="rounded-[20px] border border-gray-100 p-5 hover:shadow-[0_8px_25px_rgba(236,72,153,0.06)] transition-shadow duration-300"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
                                <Scissors size={16} className="text-[#EC4899]" />
                              </div>
                              <span className="font-semibold text-[14px] text-[#111]">Hair Health</span>
                            </div>
                            <span className="text-[18px] font-bold text-[#EC4899]">
                              {MOCK_ANALYSIS.hair.score}
                              <span className="text-[10px] font-medium text-gray-300">%</span>
                            </span>
                          </div>
                          <div className="space-y-3">
                            {MOCK_ANALYSIS.hair.metrics.map((m) => (
                              <ScoreBar key={m.label} label={m.label} score={m.score} color="#EC4899" />
                            ))}
                          </div>
                        </motion.div>

                        <motion.div
                          whileHover={{ y: -2 }}
                          className="rounded-[20px] border border-gray-100 p-5 hover:shadow-[0_8px_25px_rgba(168,85,247,0.06)] transition-shadow duration-300"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                                <Droplets size={16} className="text-[#A855F7]" />
                              </div>
                              <span className="font-semibold text-[14px] text-[#111]">Skin Health</span>
                            </div>
                            <span className="text-[18px] font-bold text-[#A855F7]">
                              {MOCK_ANALYSIS.skin.score}
                              <span className="text-[10px] font-medium text-gray-300">%</span>
                            </span>
                          </div>
                          <div className="space-y-3">
                            {MOCK_ANALYSIS.skin.metrics.map((m) => (
                              <ScoreBar key={m.label} label={m.label} score={m.score} color="#A855F7" />
                            ))}
                          </div>
                        </motion.div>
                      </div>

                      <motion.div
                        whileHover={{ y: -1 }}
                        className="relative rounded-[20px] overflow-hidden p-6"
                        style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFF0F5 100%)" }}
                      >
                        <div className="relative z-10 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/90 flex items-center justify-center shrink-0 shadow-sm">
                            <Sparkles size={18} className="text-[#EC4899]" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-[#111] text-[15px] mb-1">Top Recommendation</h4>
                            <p className="text-[12px] text-gray-500 leading-relaxed max-w-[70%]">
                              Continue with your current hair care routine and maintain hydration for best results.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 text-[10px] font-medium text-[#EC4899]">
                                <Scissors size={10} /> Suggested Treatments
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 text-[10px] font-medium text-[#A855F7]">
                                <Droplets size={10} /> Suggested Products
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/80 text-[10px] font-medium text-[#F59E0B]">
                                <Star size={10} /> Salon Services
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[35%]">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 z-10" />
                          <img
                            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80&auto=format&fit=crop"
                            alt="Beauty product"
                            className="w-full h-full object-cover opacity-80"
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {activeTab === "hair" && (
                    <motion.div
                      key="hair"
                      variants={tabVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
                          <Scissors size={22} className="text-[#EC4899]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[16px] text-[#111]">Hair Health Analysis</h4>
                          <p className="text-[12px] text-gray-400">Detailed breakdown of your hair condition</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[28px] font-bold text-[#EC4899]">{MOCK_ANALYSIS.hair.score}</span>
                          <span className="text-[12px] text-gray-300 font-medium">/100</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {MOCK_ANALYSIS.hair.metrics.map((m, i) => (
                          <motion.div
                            key={m.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-[16px] border border-gray-100 p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: "#EC4899" + "15" }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
                                </div>
                                <span className="text-[13px] font-medium text-gray-700">{m.label}</span>
                              </div>
                              <span className="text-[13px] text-gray-500 font-medium">{m.status}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: "#EC4899" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${m.score}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div
                        className="rounded-[20px] p-5 border border-pink-100"
                        style={{ background: "linear-gradient(135deg, #FFF7FA, #FCE7F3)" }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                            <Star size={16} className="text-[#F59E0B]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-[14px] text-[#111] mb-0.5">Hair Care Tip</h4>
                            <p className="text-[12px] text-gray-500 leading-relaxed">
                              Your hair shows good overall health. To maintain and improve, consider a weekly deep
                              conditioning treatment and minimize heat styling to prevent damage.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "skin" && (
                    <motion.div
                      key="skin"
                      variants={tabVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                          <Droplets size={22} className="text-[#A855F7]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[16px] text-[#111]">Skin Health Analysis</h4>
                          <p className="text-[12px] text-gray-400">Detailed breakdown of your skin condition</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[28px] font-bold text-[#A855F7]">{MOCK_ANALYSIS.skin.score}</span>
                          <span className="text-[12px] text-gray-300 font-medium">/100</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {MOCK_ANALYSIS.skin.metrics.map((m, i) => (
                          <motion.div
                            key={m.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-[16px] border border-gray-100 p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: "#A855F7" + "15" }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
                                </div>
                                <span className="text-[13px] font-medium text-gray-700">{m.label}</span>
                              </div>
                              <span className="text-[13px] text-gray-500 font-medium">{m.status}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: "#A855F7" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${m.score}%` }}
                                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div
                        className="rounded-[20px] p-5 border border-purple-100"
                        style={{ background: "linear-gradient(135deg, #FAF5FF, #F3E8FF)" }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                            <Sun size={16} className="text-[#F59E0B]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-[14px] text-[#111] mb-0.5">Skin Care Tip</h4>
                            <p className="text-[12px] text-gray-500 leading-relaxed">
                              Your skin is in excellent condition. Keep up your hydration routine and apply SPF daily to
                              maintain your clear complexion.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "recommendations" && (
                    <motion.div
                      key="recommendations"
                      variants={tabVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                          <Zap size={22} className="text-[#F59E0B]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[16px] text-[#111]">Personalized Recommendations</h4>
                          <p className="text-[12px] text-gray-400">AI-powered suggestions for you</p>
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-gray-100 overflow-hidden">
                        {MOCK_ANALYSIS.recommendations.map((rec, i) => (
                          <motion.div
                            key={rec.title}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`flex items-start gap-4 px-5 py-4 ${i > 0 ? "border-t border-gray-50" : ""}`}
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                              style={{ backgroundColor: rec.color + "12" }}
                            >
                              <rec.icon size={18} style={{ color: rec.color }} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-[14px] text-[#111] mb-0.5">{rec.title}</h5>
                              <p className="text-[12px] text-gray-400 leading-relaxed">{rec.desc}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 shrink-0 mt-2" />
                          </motion.div>
                        ))}
                      </div>

                      <div
                        className="relative rounded-[20px] overflow-hidden p-6"
          style={{ background: "linear-gradient(135deg, #FFF7FA 0%, #FCE7F3 50%, #FFFDFD 100%)" }}
                      >
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center">
                              <Star size={15} className="text-[#F59E0B]" />
                            </div>
                            <span className="font-semibold text-[14px] text-[#111]">Premium Salon Treatments</span>
                          </div>
                          <p className="text-[12px] text-gray-500 leading-relaxed mb-4 max-w-[65%]">
                            Based on your analysis, we recommend visiting a premium salon for a professional deep
                            conditioning treatment and customized facial.
                          </p>
                          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#111] text-white text-[12px] font-semibold hover:bg-[#333] transition-all shadow-md">
                            Book a Salon
                            <ChevronRight size={13} />
                          </button>
                        </div>
                        <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[40%]">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 z-10" />
                          <img
                            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80&auto=format&fit=crop"
                            alt="Salon treatment"
                            className="w-full h-full object-cover opacity-80"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
