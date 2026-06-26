"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user.service";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { User, Mail, Phone, MapPin, CreditCard, Calendar, Save } from "lucide-react";

export default function ProfilePage() {
  const { profile, subscription } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      await userService.updateProfile({ full_name: fullName, phone });
      setMessage("Profile updated successfully!");
    } catch (err: any) {
      setMessage(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <CustomerNavbar />
      <main className="max-w-3xl mx-auto px-6 pt-[112px] pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-6">My Profile</h1>

        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300 mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E5E7EB]/60">
            <div className="w-20 h-20 rounded-full bg-[#EC4899] flex items-center justify-center text-white text-3xl font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111827]">{profile?.full_name || "User"}</h2>
              <p className="text-sm text-[#6B7280]">{profile?.email || ""}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                {profile?.role === "salon_owner" ? "Salon Owner" : profile?.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] text-sm text-[#6B7280] cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1.5">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] focus:outline-none transition-all"
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-sm ${message.includes("success") ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 h-12 bg-[#EC4899] text-white rounded-xl text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6 md:p-8 shadow-sm hover:shadow-lg transition-all duration-300">
          <h3 className="text-lg font-semibold text-[#111827] mb-4">Account Info</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <CreditCard size={16} className="text-[#9CA3AF]" />
              <span className="text-[#6B7280]">Plan:</span>
              <span className="text-[#111827] font-medium">{subscription?.display_name || "Free"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={16} className="text-[#9CA3AF]" />
              <span className="text-[#6B7280]">Joined:</span>
              <span className="text-[#111827] font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
