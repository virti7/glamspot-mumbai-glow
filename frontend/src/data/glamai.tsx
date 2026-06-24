import { Scissors, Zap, Shield, Sparkles as SparklesIcon, Award } from "lucide-react";

export const SCAN_MESSAGES = [
  "Scanning hair follicles...",
  "Analyzing skin texture...",
  "Measuring hydration levels...",
  "Detecting scalp condition...",
  "Calculating beauty score...",
  "Generating insights...",
];

export const FEATURE_PILLS = [
  { icon: <Scissors size={18} />, l: "Hair Porosity Detection" },
  { icon: <Zap size={18} />, l: "Moisture Level Scan" },
  { icon: <Shield size={18} />, l: "Scalp Health Analysis" },
  { icon: <SparklesIcon size={18} />, l: "Skin Type Detection" },
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

export const MOCK_ANALYSIS = {
  aiScore: 92,
  overallLabel: "Excellent Condition",
  overallDesc:
    "Your comprehensive analysis reveals excellent hair and skin health. Your current routine is working well, and with a few targeted enhancements, you can achieve even better results.",
  tags: ["Healthy Hair", "Clear Skin", "Well Balanced"],
  recommendation:
    "Continue with your current hair care routine and maintain hydration for best results.",
  hair: { score: 90 },
  skin: { score: 94 },
  scalp: { score: 85 },
  hydration: { score: 88 },
  insights: [
    { text: "Hair is healthy and well-nourished", status: "positive" },
    { text: "Good hydration levels detected", status: "positive" },
    { text: "Minor scalp dryness in some areas", status: "neutral" },
    { text: "Excellent skin clarity and texture", status: "positive" },
    { text: "Balanced oil production", status: "positive" },
  ],
};

export const PRODUCTS = [
  {
    id: 1,
    name: "HydraGlow Moisture Serum",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200&q=80&auto=format&fit=crop",
    reason: "Boosts hydration for your skin type",
    score: 96,
  },
  {
    id: 2,
    name: "SilkPro Hair Mask",
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=200&q=80&auto=format&fit=crop",
    reason: "Strengthens hair follicles",
    score: 94,
  },
  {
    id: 3,
    name: "Scalp Renew Treatment",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=200&q=80&auto=format&fit=crop",
    reason: "Addresses minor scalp dryness",
    score: 91,
  },
  {
    id: 4,
    name: "Vitamin C Brightening Cream",
    image: "https://images.unsplash.com/photo-1570194065650-d99fb4ee8e39?w=200&q=80&auto=format&fit=crop",
    reason: "Enhances skin radiance",
    score: 93,
  },
];

export const SALONS = [
  {
    id: 1,
    name: "Blush Beauty Lounge",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80&auto=format&fit=crop",
    rating: 4.8,
    distance: "0.8 km",
    treatment: "Deep Conditioning Therapy",
  },
  {
    id: 2,
    name: "Glow Studio & Spa",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80&auto=format&fit=crop",
    rating: 4.9,
    distance: "1.2 km",
    treatment: "HydraFacial Premium",
  },
  {
    id: 3,
    name: "The Hair Sanctuary",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&q=80&auto=format&fit=crop",
    rating: 4.7,
    distance: "2.1 km",
    treatment: "Scalp Detox Treatment",
  },
];
