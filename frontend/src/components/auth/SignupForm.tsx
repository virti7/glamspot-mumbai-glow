"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Mail } from "lucide-react";
import { PasswordField } from "./PasswordField";
import { SocialButtons } from "./SocialButtons";
import { useAuth } from "@/contexts/AuthContext";

export function SignupForm() {
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName, phone || undefined);
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="font-display font-bold text-[32px] md:text-[34px] text-[#111] leading-[1.1] tracking-[-0.01em]">
        Create Account
      </h1>
      <p className="text-[#6B7280] text-[14px] leading-[1.55] mt-2.5 pr-4">
        Join GlamSpot and get access to the best beauty experiences in Mumbai.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="signup-name" className="block text-[13px] font-medium text-[#111] mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              id="signup-name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-[46px] pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]/10 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-[13px] font-medium text-[#111] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              id="signup-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[46px] pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]/10 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-phone" className="block text-[13px] font-medium text-[#111] mb-1.5">
            Phone Number
          </label>
          <div className="relative flex">
            <div className="flex items-center gap-1.5 pl-3.5 pr-2 h-[46px] rounded-l-xl border border-r-0 border-[#E5E7EB] bg-[#F9FAFB] text-[13px] text-[#374151] flex-shrink-0">
              <span className="text-[14px]">+91</span>
            </div>
            <input
              id="signup-phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 h-[46px] px-3 rounded-r-xl border border-[#E5E7EB] bg-white text-[14px] text-[#111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]/10 transition-all"
            />
          </div>
        </div>

        <PasswordField label="Password" placeholder="Create a password" id="signup-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField label="Confirm Password" placeholder="Confirm your password" id="signup-confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-[15px] h-[15px] mt-0.5 rounded-[4px] border-[#D1D5DB] accent-[#E85D75] cursor-pointer flex-shrink-0"
          />
          <span className="text-[12.5px] text-[#6B7280] leading-[1.45]">
            I agree to the{" "}
            <Link href="#" className="text-[#E85D75] font-medium hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="#" className="text-[#E85D75] font-medium hover:underline">Privacy Policy</Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[48px] bg-[#111] text-white rounded-xl text-[15px] font-semibold hover:bg-[#333] active:scale-[0.98] transition-all mt-1 disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#E5E7EB]" />
        <span className="text-[12px] text-[#9CA3AF] whitespace-nowrap">or continue with</span>
        <div className="flex-1 h-px bg-[#E5E7EB]" />
      </div>

      <SocialButtons />

      <p className="text-center text-[13px] text-[#6B7280] mt-5 pb-2">
        Already have an account?{" "}
        <Link href="/signin" className="text-[#E85D75] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
