"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Settings, Loader2, Shield, Save, Percent, Crown, Bell, DollarSign } from "lucide-react";

interface PlatformSettings {
  id?: number;
  commission_percent: number;
  featured_salon_price: number;
  free_plan_scans: number;
  pro_plan_scans: number;
  pro_plan_price: number;
  email_notifications: boolean;
  new_claim_notifications: boolean;
  new_salon_notifications: boolean;
  maintenance_mode: boolean;
}

const defaultSettings: PlatformSettings = {
  commission_percent: 10, featured_salon_price: 999, free_plan_scans: 5, pro_plan_scans: 50, pro_plan_price: 499,
  email_notifications: true, new_claim_notifications: true, new_salon_notifications: true, maintenance_mode: false,
};

export default function AdminSettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    api.get<PlatformSettings>("/admin/settings")
      .then((data) => { if (data && Object.keys(data).length > 0) setSettings({ ...defaultSettings, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try { await api.put("/admin/settings", settings); setSuccess("Settings saved successfully"); setTimeout(() => setSuccess(""), 3000); }
    catch { setError("Failed to save settings"); }
    finally { setSaving(false); }
  };

  const updateField = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (profile?.role !== "admin") {
    return <div className="flex items-center justify-center min-h-[60vh]"><Shield size={48} className="text-red-400" /></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 size={24} className="text-gray-300 animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] mb-1">Settings</h1>
          <p className="text-sm text-[#6B7280]">Platform configuration</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] text-white text-[13px] font-semibold border-none cursor-pointer transition-all ${saving ? "opacity-50" : ""}`}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && <div className="mb-4 p-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>}
      {success && <div className="mb-4 p-3 px-4 rounded-xl bg-green-100 border border-green-200 text-green-800 text-[13px] font-medium">{success}</div>}

      <div className="flex flex-col gap-5">
        {/* Commission */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Percent size={18} style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827]">Platform Commission</h3>
              <p className="text-[12px] text-[#6B7280]">Commission charged on each booking</p>
            </div>
          </div>
          <div className="max-w-xs">
            <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">Commission Percentage</label>
            <div className="relative">
              <input type="number" value={settings.commission_percent} onChange={(e) => updateField("commission_percent", Math.max(0, Math.min(100, Number(e.target.value))))} className="w-full h-11 px-3.5 pr-8 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Featured Salon Pricing */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Crown size={18} style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827]">Featured Salon Pricing</h3>
              <p className="text-[12px] text-[#6B7280]">Price for salon spotlight feature</p>
            </div>
          </div>
          <div className="max-w-xs">
            <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">Featured Salon Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">₹</span>
              <input type="number" value={settings.featured_salon_price} onChange={(e) => updateField("featured_salon_price", Math.max(0, Number(e.target.value)))} className="w-full h-11 pl-7 pr-3.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all" />
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign size={18} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827]">Subscription Plans</h3>
              <p className="text-[12px] text-[#6B7280]">Free and Pro plan configurations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">Free Plan - Scans Limit</label>
              <input type="number" value={settings.free_plan_scans} onChange={(e) => updateField("free_plan_scans", Math.max(0, Number(e.target.value)))} className="w-full h-11 px-3.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">Pro Plan - Scans Limit</label>
              <input type="number" value={settings.pro_plan_scans} onChange={(e) => updateField("pro_plan_scans", Math.max(0, Number(e.target.value)))} className="w-full h-11 px-3.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all" />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[#374151] mb-1.5 block">Pro Plan - Price (₹/mo)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm">₹</span>
                <input type="number" value={settings.pro_plan_price} onChange={(e) => updateField("pro_plan_price", Math.max(0, Number(e.target.value)))} className="w-full h-11 pl-7 pr-3.5 rounded-xl border border-[#E5E7EB] text-sm text-[#111827] bg-white outline-none focus:ring-2 focus:ring-[#EC4899]/20 focus:border-[#EC4899] transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB]/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Bell size={18} style={{ color: "#EC4899" }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827]">Notification Settings</h3>
              <p className="text-[12px] text-[#6B7280]">Admin notification preferences</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { key: "email_notifications" as const, label: "Email Notifications", desc: "Receive email updates for platform activity" },
              { key: "new_claim_notifications" as const, label: "New Claim Alerts", desc: "Get notified when a new ownership claim is submitted" },
              { key: "new_salon_notifications" as const, label: "New Salon Alerts", desc: "Get notified when a new salon registers" },
              { key: "maintenance_mode" as const, label: "Maintenance Mode", desc: "Put the platform in maintenance mode" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-[#FAFAFB]">
                <div>
                  <p className="text-[13px] font-medium text-[#111827]">{item.label}</p>
                  <p className="text-[12px] text-[#6B7280] mt-0.5">{item.desc}</p>
                </div>
                <button onClick={() => updateField(item.key, !settings[item.key])}
                  className={`w-11 h-6 rounded-full border-none cursor-pointer relative transition-all flex-shrink-0 ${settings[item.key] ? "bg-[#EC4899]" : "bg-[#E5E7EB]"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${settings[item.key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
