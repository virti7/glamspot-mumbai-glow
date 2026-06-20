import { api } from "./api";

export interface AuthResponse {
  user: { id: string; email: string | null };
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string;
    created_at: string;
  };
  subscription: {
    plan_name: string;
    display_name: string;
    scans_limit: number | null;
    scans_used: number;
    scans_remaining: number;
    status: string;
  } | null;
  token: string;
}

export const authService = {
  signIn: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/signin", { email, password }),

  signUp: (email: string, password: string, fullName: string, phone?: string) =>
    api.post<AuthResponse>("/auth/signup", { email, password, fullName, phone }),

  signOut: () => api.post<{ message: string }>("/auth/signout"),

  getSession: () => api.get<AuthResponse>("/auth/session"),
};
