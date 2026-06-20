import { api } from "./api";

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface UserStats {
  totalBookings: number;
  completedBookings: number;
  upcomingBookings: number;
  favoriteSalons: number;
  glamScansUsed: number;
  glamScansRemaining: number;
}

export interface UserSubscription {
  plan_name: string;
  display_name: string;
  scans_limit: number | null;
  scans_used: number;
  scans_remaining: number;
  status: string;
}

export interface FavoriteSalon {
  id: string;
  salon_id: string;
  created_at: string;
  salon: {
    id: string;
    name: string;
    locality: string;
    rating: number;
    cover_image: string | null;
    price_min: number | null;
    price_max: number | null;
  };
}

export const userService = {
  getProfile: () => api.get<UserProfile>("/users/profile"),

  updateProfile: (data: Partial<Pick<UserProfile, "full_name" | "phone">>) =>
    api.put<UserProfile>("/users/profile", data),

  getSubscription: () => api.get<UserSubscription>("/users/subscription"),

  getScanQuota: () => api.get<{ allowed: boolean; scansUsed: number; scansLimit: number | null; remaining: number }>("/users/scan-quota"),

  getBookings: () => api.get<any[]>("/users/bookings"),

  getFavorites: () => api.get<FavoriteSalon[]>("/users/favorites"),

  addFavorite: (salonId: string) => api.post<any>("/users/favorites", { salonId }),

  removeFavorite: (salonId: string) => api.delete<any>(`/users/favorites/${salonId}`),

  getStats: () => api.get<UserStats>("/users/stats"),
};
