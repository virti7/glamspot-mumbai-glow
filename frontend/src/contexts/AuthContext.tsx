"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface AuthSubscription {
  plan_name: string;
  display_name: string;
  scans_limit: number | null;
  scans_used: number;
  scans_remaining: number;
  status: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthProfile | null;
  subscription: AuthSubscription | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  isSalonOwner: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;
  const isSalonOwner = profile?.role === "salon_owner";
  const isAdmin = profile?.role === "admin";

  const refreshSession = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        clearAccessToken();
        setUser(null);
        setProfile(null);
        setSubscription(null);
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setProfile(data.profile);
      setSubscription(data.subscription);
    } catch {
      clearAccessToken();
      setUser(null);
      setProfile(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign in failed");
      }

      setAccessToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      setSubscription(data.subscription);

      if (data.profile.role === "salon_owner") {
        router.push("/salon-dashboard");
      } else if (data.profile.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign up failed");
      }

      setAccessToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      setSubscription(data.subscription);
      router.push("/dashboard");
    } catch (error: any) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAccessToken();
    setUser(null);
    setProfile(null);
    setSubscription(null);
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        subscription,
        loading,
        signIn,
        signUp,
        signOut,
        refreshSession,
        isAuthenticated,
        isSalonOwner,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
