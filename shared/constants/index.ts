export const LOCALITIES = ["All Mumbai", "Bandra", "Andheri", "Juhu", "Powai", "Colaba", "Kurla"] as const;

export const SERVICES = ["All Services", "Hair", "Skin", "Bridal", "Nails", "Men's Grooming"] as const;

export const BOOKING_SERVICES = [
  "Haircut",
  "Hair Color",
  "Keratin",
  "Facial",
  "Bridal Makeup",
  "Nail Art",
  "Men's Grooming",
  "Hair Spa",
] as const;

export const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
] as const;

export const BOOKED_SLOTS = new Set(["12:00 PM", "4:00 PM"]);

export const SUPABASE_BUCKETS = {
  GLAM_SCANS: "glam-scans",
} as const;

export const ANTHROPIC_MODELS = {
  VISION: "claude-sonnet-4-20250514",
} as const;
