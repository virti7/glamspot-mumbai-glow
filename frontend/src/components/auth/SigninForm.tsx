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
      <h1 className="font-display font-bold text-[32px] md:text-[34px] text-[#111] leading-[1.1] tracking-[-0.01em]">
        Welcome Back!
      </h1>
      <p className="text-[#6B7280] text-[14px] leading-[1.55] mt-2.5 pr-4">
        Sign in to continue discovering &amp; booking the best salons in Mumbai.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="signin-email" className="block text-[13px] font-medium text-[#111] mb-1.5">
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
              className="w-full h-[46px] pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]/10 transition-all"
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
              className="w-[15px] h-[15px] rounded-[4px] border-[#D1D5DB] accent-[#E85D75] cursor-pointer"
            />
            <span className="text-[13px] text-[#6B7280]">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-[13px] text-[#E85D75] font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[48px] bg-[#111] text-white rounded-xl text-[15px] font-semibold hover:bg-[#333] active:scale-[0.98] transition-all mt-1 disabled:opacity-50"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#E5E7EB]" />
        <span className="text-[12px] text-[#9CA3AF] whitespace-nowrap">or continue with</span>
        <div className="flex-1 h-px bg-[#E5E7EB]" />
      </div>

      <SocialButtons />

      <p className="text-center text-[13px] text-[#6B7280] mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#E85D75] font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
