import { Scissors, Zap, Shield, Sparkles, Award } from "lucide-react";

export const SCAN_MESSAGES = [
  "Detecting hair porosity...",
  "Measuring moisture levels...",
  "Scanning scalp health...",
  "Generating your report...",
];

export const FEATURE_PILLS = [
  { icon: <Scissors size={18} />, l: "Hair Porosity Detection" },
  { icon: <Zap size={18} />, l: "Moisture Level Scan" },
  { icon: <Shield size={18} />, l: "Scalp Health Analysis" },
  { icon: <Sparkles size={18} />, l: "Skin Type Detection" },
  { icon: <Award size={18} />, l: "Treatment Matching" },
];

export const BEFORE_AFTER_CARDS = [
  { image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&q=80" },
  { image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80" },
  { image: "https://images.unsplash.com/photo-1551392505-f4056032826e?w=300&q=80" },
];

export type ScanResult = {
  condition: string;
  damage_level: number;
  concern_type: "hair" | "skin";
  treatments: string[];
  urgency: "routine" | "important" | "urgent";
  tip: string;
};
