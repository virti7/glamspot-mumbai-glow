"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PasswordField } from "./PasswordField";
import { SocialButtons } from "./SocialButtons";
import { useAuth } from "@/contexts/AuthContext";

export function SigninForm() {
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="font-display font-bold text-[32px] md:text-[34px] text-[#111827] leading-[1.1] tracking-[-0.01em]">
        Welcome Back!
      </h1>
      <p className="text-sm text-[#6B7280] leading-relaxed mt-2.5 pr-4">
        Sign in to continue discovering &amp; booking the best salons in Mumbai.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-[#111827] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              id="signin-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] focus:outline-none transition-all"
            />
          </div>
        </div>

        <PasswordField label="Password" placeholder="Enter your password" id="signin-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-[15px] h-[15px] rounded-[4px] border-[#D1D5DB] accent-[#EC4899] cursor-pointer"
            />
            <span className="text-sm text-[#6B7280]">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-[#EC4899] font-medium hover:text-[#DB2777] transition-colors">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-[#EC4899] text-white rounded-xl text-sm font-semibold hover:bg-[#DB2777] transition-all mt-1 disabled:opacity-50"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#E5E7EB]/60" />
        <span className="text-xs text-[#9CA3AF] whitespace-nowrap">or continue with</span>
        <div className="flex-1 h-px bg-[#E5E7EB]/60" />
      </div>

      <SocialButtons />

      <p className="text-center text-sm text-[#6B7280] mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#EC4899] font-semibold hover:text-[#DB2777] transition-colors">
          Sign up
        </Link>
      </p>
    </>
  );
}
