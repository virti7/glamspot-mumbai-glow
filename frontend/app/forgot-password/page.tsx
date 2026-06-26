"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseClient } from "@/lib/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    try {
      if (!supabaseClient) throw new Error("Authentication service unavailable");
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout imageUrl="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1000&q=90">
      <div className="flex flex-col items-start">
        <Link
          href="/signin"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] font-medium hover:text-[#111827] transition-colors mb-8"
        >
          <ArrowLeft size={15} />
          Back to Sign In
        </Link>

        <h1 className="font-display font-bold text-[32px] md:text-[34px] text-[#111827] leading-[1.1] tracking-[-0.01em]">
          Forgot Password
        </h1>
        <p className="text-sm text-[#6B7280] leading-relaxed mt-2.5">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {error && (
          <div className="w-full mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {sent ? (
          <div className="w-full mt-6 p-6 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
            Check your email for the password reset link.
          </div>
        ) : (
          <form className="w-full mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-[#111827] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#EC4899] text-white rounded-xl text-sm font-semibold hover:bg-[#DB2777] transition-all mt-1 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#6B7280] mt-6 w-full">
          Remember your password?{" "}
          <Link href="/signin" className="text-[#EC4899] font-semibold hover:text-[#DB2777] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
