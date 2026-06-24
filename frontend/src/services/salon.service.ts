import { api } from "./api";

export interface Salon {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
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
}

export interface SalonService {
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

export interface SalonImage {
  id: string;
  salon_id: string;
  image_url: string;
  category: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface SalonStaffMember {
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

export interface SalonHours {
  id: string;
  salon_id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface SalonReview {
  id: string;
  user_id: string;
  salon_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { full_name: string; avatar_url: string | null } | null;
  owner_reply: string | null;
}

export interface SalonDetail extends Salon {
  services: SalonService[];
  images?: SalonImage[];
  staff?: SalonStaffMember[];
  hours?: SalonHours[];
  reviews?: SalonReview[];
}

export const salonService = {
  getAll: (params?: {
    locality?: string;
    service?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.locality) searchParams.set("locality", params.locality);
    if (params?.service) searchParams.set("service", params.service);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.minPrice) searchParams.set("minPrice", String(params.minPrice));
    if (params?.maxPrice) searchParams.set("maxPrice", String(params.maxPrice));
    if (params?.minRating) searchParams.set("minRating", String(params.minRating));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const qs = searchParams.toString();
    return api.get<{ salons: Salon[]; total: number }>(`/salons${qs ? `?${qs}` : ""}`);
  },

  getBySlug: (slug: string) => api.get<SalonDetail>(`/salons/slug/${slug}`),

  getById: (id: string) => api.get<SalonDetail>(`/salons/${id}`),

  getServices: (salonId: string) => api.get<SalonService[]>(`/salons/${salonId}/services`),

  getOwnerSalon: () => api.get<Salon>("/salons/owner"),
};
