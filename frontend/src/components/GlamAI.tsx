import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { uploadScanImage, analyzeScan } from "@/services/glamai.service";
import { SCAN_MESSAGES, FEATURE_PILLS, BEFORE_AFTER_CARDS, type ScanResult } from "@/data/glamai";
import { ResultsView } from "./ResultsView";

export function GlamAI() {
  const [state, setState] = useState<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        setResult(analyzeResult.result);
        setState("done");
      } catch (e: any) {
        setError(
          e?.message ?? "Could not analyze photo. Please try a clearer image in good lighting.",
        );
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
  };

  return (
    <section id="glamai" className="bg-white">
      <div className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] py-3 px-6 md:px-[60px] relative overflow-hidden">
        <p className="text-white text-xs font-bold uppercase tracking-[0.15em] text-center">
          <Sparkles size={14} className="inline mr-1.5" /> INTRODUCING GLAMAI — MUMBAI'S FIRST AI
          BEAUTY DIAGNOSIS
        </p>
        <div className="banner-shimmer absolute inset-0 pointer-events-none" />
      </div>

      <div
        className="mx-6 md:mx-[60px] my-8 bg-[#111827] rounded-3xl px-8 md:px-12 py-10 relative overflow-hidden shadow-2xl border border-[#222]/10"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.15)" }}
      >
        <img
          src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1200&q=30"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] blur-[20px] pointer-events-none"
        />

        <div className="text-center max-w-2xl mx-auto relative z-10">
          <h2 className="font-display font-bold text-4xl md:text-5xl leading-[1.1] gold-shimmer-text">
            GlamAI
          </h2>
          <h3 className="font-display text-white text-2xl mt-2">
            Reads Your Hair &amp; Skin.
          </h3>
          <p className="text-sm text-[#9CA3AF] mt-3 max-w-lg mx-auto text-center">
            Upload one photo. Get a complete beauty health report and find Mumbai salons that treat
            your exact condition.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-6 relative z-10">
          {FEATURE_PILLS.map((p) => (
            <span
              key={p.l}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs flex items-center gap-1.5 hover:border-[#EC4899] transition cursor-default"
            >
              <span className="text-[#EC4899]">{p.icon}</span> {p.l}
            </span>
          ))}
        </div>

        <div className="flex justify-center gap-3 mt-6 relative z-10">
          {BEFORE_AFTER_CARDS.map((c, i) => (
            <div
              key={i}
              className="relative w-[120px] h-[160px] rounded-xl overflow-hidden shadow-lg flex-shrink-0"
            >
              <img
                src={c.image}
                alt="Before and after"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.05) 100%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-full bg-white/30" />
              </div>
              <span className="absolute bottom-2 inset-x-0 text-center text-white text-[10px] Inter">
                Before &rarr; After
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-[#9CA3AF] text-xs mt-3 relative z-10">
          See what GlamAI can detect <ArrowRight size={10} className="inline" />
        </p>

        <div className="grid lg:grid-cols-2 gap-6 mt-8 max-w-5xl mx-auto relative z-10">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="rounded-2xl p-10 min-h-[400px] flex flex-col items-center justify-center text-center transition-colors"
            style={{
              background: "#0D0D0D",
              border: `2px dashed ${dragOver ? "#EC4899" : "#333"}`,
            }}
          >
            {state === "idle" && (
              <>
                <div className="relative w-[80px] h-[80px] flex items-center justify-center">
                  <span
                    className="absolute inset-0 rounded-full pulse-ring"
                    style={{ background: "rgba(236,72,153,0.3)" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full pulse-ring-2"
                    style={{ background: "rgba(236,72,153,0.2)" }}
                  />
                  <span
                    className="absolute inset-0 rounded-full pulse-ring-3"
                    style={{ background: "rgba(236,72,153,0.15)" }}
                  />
                  <span className="relative z-10 text-[#EC4899]">
                    <Camera size={28} />
                  </span>
                </div>
                <h3 className="font-display text-white text-lg mt-4">
                  {dragOver ? "Drop it here" : "Upload Your Hair or Skin Photo"}
                </h3>
                <p className="text-xs text-[#6B7280] mt-1.5">
                  Clear photo in good lighting gives best results
                </p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 bg-white text-[#111827] rounded-xl px-6 py-3 text-sm font-semibold hover:bg-[#EC4899] hover:text-white transition-all"
                >
                  Choose Photo
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </>
            )}

            {(state === "uploading" || state === "scanning") && preview && (
              <>
                <div className="relative w-[140px] h-[140px]">
                  <img
                    src={preview}
                    alt="upload"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div
                    className="absolute -inset-2 rounded-full spin-ring"
                    style={{ border: "3px solid transparent", borderTopColor: "#EC4899" }}
                  />
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div
                      className="scan-line absolute left-0 right-0 h-[3px]"
                      style={{
                        background: "linear-gradient(90deg, transparent, #EC4899, transparent)",
                      }}
                    />
                  </div>
                </div>
                <p className="text-white text-[14px] mt-4">
                  {state === "uploading" ? "Uploading your photo..." : "GlamAI is analyzing your photo..."}
                </p>
                <p key={msgIdx} className="text-[#888] text-[12px] mt-1.5 fade-up">
                  {SCAN_MESSAGES[msgIdx]}
                </p>
              </>
            )}

            {state === "done" && preview && (
              <>
                <div className="relative">
                  <img
                    src={preview}
                    alt="upload"
                    className="w-[120px] h-[120px] rounded-full object-cover"
                    style={{ border: "3px solid #4ADE80" }}
                  />
                </div>
                <p className="text-[#4ADE80] text-[13px] mt-3 flex items-center gap-1">
                  <Check size={14} /> Analysis Complete
                </p>
                <button
                  onClick={reset}
                  className="mt-3 text-[#888] text-[12px] hover:text-white transition"
                >
                  Scan another photo
                </button>
              </>
            )}

            {state === "error" && (
              <>
                <span className="text-4xl text-[#888]">
                  <Camera size={36} />
                </span>
                <p className="text-white text-[14px] mt-3">{error}</p>
                <button
                  onClick={reset}
                  className="mt-4 bg-white text-[#111827] rounded-xl px-5 py-2 text-[13px] font-semibold"
                >
                  Try Again
                </button>
              </>
            )}
          </div>

          <div className="min-h-[400px]">
            {state === "idle" || state === "error" ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-[#EC4899]">
                  <Sparkles size={32} />
                </span>
                <h3 className="font-display text-white text-lg mt-3">
                  Your GlamAI Report Will Appear Here
                </h3>
                <p className="text-xs text-[#6B7280] mt-1.5 max-w-sm">
                  Upload a photo to get your personalized beauty diagnosis
                </p>
                <div className="w-full max-w-sm mt-5 space-y-2 blur-sm select-none">
                  {[
                    "Hair Porosity: ██████ ?/10",
                    "Moisture Level: ████ ?/10",
                    "Damage Score: ████████ ?/10",
                  ].map((t) => (
                    <div
                      key={t}
                      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-[#666] text-[12px]"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : state === "uploading" || state === "scanning" ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative h-20 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              result && <ResultsView r={result} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
