"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Lock } from "lucide-react";
import { PasswordField } from "@/components/auth/PasswordField";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User is authenticated for password reset
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (!supabaseClient) throw new Error("Authentication service unavailable");
      const { error: updateError } = await supabaseClient.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push("/signin"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout imageUrl="https://images.unsplash.com/photo-1551392505-f4056032826e?w=1000&q=90">
      <div className="flex flex-col items-start">
        <h1 className="font-display font-bold text-[32px] md:text-[34px] text-[#111] leading-[1.1] tracking-[-0.01em]">
          Reset Password
        </h1>
        <p className="text-[#6B7280] text-[14px] leading-[1.55] mt-2.5">
          Enter your new password below.
        </p>

        {error && (
          <div className="w-full mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        {success ? (
          <div className="w-full mt-6 p-6 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[14px]">
            Password updated successfully! Redirecting to sign in...
          </div>
        ) : (
          <form className="w-full mt-6 space-y-4" onSubmit={handleSubmit}>
            <PasswordField
              label="New Password"
              placeholder="Enter new password"
              id="reset-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordField
              label="Confirm Password"
              placeholder="Confirm new password"
              id="reset-confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[48px] bg-[#111] text-white rounded-xl text-[15px] font-semibold hover:bg-[#333] active:scale-[0.98] transition-all mt-1 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
