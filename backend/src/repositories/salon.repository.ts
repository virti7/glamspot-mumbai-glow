import { getSupabaseServerClient } from "../integrations/supabase/client";
import { AppError } from "@glamspot/shared/schemas";

export interface SalonRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  locality: string | null;
  city: string;
  state: string | null;
  rating: number;
  reviews_count: number;
  price_min: number | null;
  price_max: number | null;
  cover_image: string | null;
  logo_image: string | null;
  amenities: string[];
  tags: string[];
  is_verified: boolean;
  is_active: boolean;
  is_claimed: boolean;
  claimed_at: string | null;
  owner_id: string | null;
  opening_time: string | null;
  closing_time: string | null;
  created_at: string;
}

export interface SalonServiceRecord {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number | null;
  price: number;
  discounted_price: number | null;
  is_popular: boolean;
}

export interface SalonStaffRecord {
  id: string;
  salon_id: string;
  name: string;
  role: string | null;
  specialization: string | null;
  experience: string | null;
  bio: string | null;
  avatar_url: string | null;
  photo: string | null;
  is_active: boolean;
}

export interface SalonHoursRecord {
  id: string;
  salon_id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface SalonImageRecord {
  id: string;
  salon_id: string;
  image_url: string;
  category: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface SalonReviewRecord {
  id: string;
  user_id: string;
  salon_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { full_name: string; avatar_url: string | null } | null;
  owner_reply: string | null;
}

export interface SalonWithServices extends SalonRecord {
  services: SalonServiceRecord[];
  images?: SalonImageRecord[];
  staff?: SalonStaffRecord[];
  hours?: SalonHoursRecord[];
  reviews?: SalonReviewRecord[];
}

export async function getSalons(params: {
  locality?: string;
  service?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  limit?: number;
  offset?: number;
}): Promise<{ salons: SalonRecord[]; total: number }> {
  const supabase = getSupabaseServerClient();
  const { locality, service, search, minPrice, maxPrice, minRating, limit = 20, offset = 0 } = params;

  let query = supabase
    .from("salons")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (locality && locality !== "All Mumbai") {
    query = query.ilike("locality", `%${locality}%`);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,locality.ilike.%${search}%`);
  }

  if (minPrice) {
    query = query.gte("price_max", minPrice);
  }

  if (maxPrice) {
    query = query.lte("price_min", maxPrice);
  }

  if (minRating) {
    query = query.gte("rating", minRating);
  }

  query = query.order("rating", { ascending: false })
    .order("reviews_count", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to fetch salons: ${error.message}`, "DB_ERROR", 500);
  }

  // If service filter is specified, filter by tags array
  let filtered = (data ?? []) as SalonRecord[];
  if (service && service !== "All Services") {
    filtered = filtered.filter(s => s.tags?.some(t => t.toLowerCase().includes(service.toLowerCase())));
  }

  return {
    salons: filtered,
    total: count ?? filtered.length,
  };
}

async function getSalonRelatedData(supabase: any, salonId: string) {
  const [services, images, staff, hours, reviews] = await Promise.all([
    supabase.from("salon_services").select("*").eq("salon_id", salonId).eq("is_active", true).order("is_popular", { ascending: false }),
    supabase.from("salon_images").select("*").eq("salon_id", salonId).order("is_primary", { ascending: false }).order("sort_order", { ascending: true }),
    supabase.from("salon_staff").select("*").eq("salon_id", salonId).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("salon_hours").select("*").eq("salon_id", salonId).order("day_of_week", { ascending: true }),
    supabase.from("reviews").select("*, user:profiles(full_name, avatar_url)").eq("salon_id", salonId).order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    services: (services.data ?? []) as SalonServiceRecord[],
    images: (images.data ?? []) as SalonImageRecord[],
    staff: (staff.data ?? []) as SalonStaffRecord[],
    hours: (hours.data ?? []) as SalonHoursRecord[],
    reviews: (reviews.data ?? []) as SalonReviewRecord[],
  };
}

export async function getSalonBySlug(slug: string): Promise<SalonWithServices | null> {
  const supabase = getSupabaseServerClient();

  const { data: salon, error } = await supabase
    .from("salons")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new AppError(`Failed to fetch salon: ${error.message}`, "DB_ERROR", 500);
  }

  const related = await getSalonRelatedData(supabase, salon.id);

  return {
    ...(salon as SalonRecord),
    ...related,
  };
}

export async function getSalonById(id: string): Promise<SalonWithServices | null> {
  const supabase = getSupabaseServerClient();

  const { data: salon, error } = await supabase
    .from("salons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new AppError(`Failed to fetch salon: ${error.message}`, "DB_ERROR", 500);
  }

  const related = await getSalonRelatedData(supabase, salon.id);

  return {
    ...(salon as SalonRecord),
    ...related,
  };
}

export async function getSalonServices(salonId: string): Promise<SalonServiceRecord[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("salon_services")
    .select("*")
    .eq("salon_id", salonId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    throw new AppError(`Failed to fetch services: ${error.message}`, "DB_ERROR", 500);
  }

  return (data ?? []) as SalonServiceRecord[];
}

export async function getSalonByOwnerId(ownerId: string): Promise<SalonRecord | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("salons")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new AppError(`Failed to fetch salon: ${error.message}`, "DB_ERROR", 500);
  }

  return data as SalonRecord | null;
}
