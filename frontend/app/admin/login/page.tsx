"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { setAccessToken } from "@/lib/auth";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { profile, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin) {
      router.push("/admin");
    }
  }, [loading, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/admin-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setAccessToken(data.token);
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF4FA2] to-pink-600 shadow-lg shadow-pink-200 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#111]">Admin Portal</h1>
          <p className="text-[14px] text-[#6B7280] mt-1">Sign in to manage GlamSpot platform</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
          )}

          <div className="mb-4">
            <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@glamspot.com"
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[14px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF4FA2]/20 focus:border-[#FF4FA2] transition"
            />
          </div>

          <div className="mb-6">
            <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-[14px] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF4FA2]/20 focus:border-[#FF4FA2] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF4FA2] to-pink-600 text-white text-[14px] font-semibold hover:from-pink-600 hover:to-pink-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            {submitting ? "Authenticating..." : "Sign In"}
          </button>

          <p className="text-center text-[12px] text-[#6B7280] mt-4">
            Only authorized administrators can access this portal.
          </p>
        </form>
      </div>
    </div>
  );
}
