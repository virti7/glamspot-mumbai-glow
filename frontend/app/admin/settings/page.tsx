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
  commission_percent: 10,
  featured_salon_price: 999,
  free_plan_scans: 5,
  pro_plan_scans: 50,
  pro_plan_price: 499,
  email_notifications: true,
  new_claim_notifications: true,
  new_salon_notifications: true,
  maintenance_mode: false,
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
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setSettings({ ...defaultSettings, ...data });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put("/admin/settings", settings);
      setSuccess("Settings saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-[#111] text-xl font-bold mb-1">Access Denied</h2>
          <p className="text-[#6B7280] text-[13px]">Admin Only</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Settings size={24} className="text-[#FF4FA2]" />
          <h1 className="text-[#111] text-2xl md:text-3xl font-bold">Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#111] text-white text-[13px] font-semibold hover:bg-gray-800 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px]">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px]">{success}</div>
      )}

      <div className="space-y-6">
        {/* Commission */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Percent size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111] text-[15px]">Platform Commission</h3>
              <p className="text-[12px] text-[#6B7280]">Commission charged on each booking</p>
            </div>
          </div>
          <div className="max-w-xs">
            <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Commission Percentage</label>
            <div className="relative">
              <input
                type="number"
                value={settings.commission_percent}
                onChange={(e) => updateField("commission_percent", Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-full pl-4 pr-8 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">%</span>
            </div>
          </div>
        </div>

        {/* Featured Salon Pricing */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Crown size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111] text-[15px]">Featured Salon Pricing</h3>
              <p className="text-[12px] text-[#6B7280]">Price for salon spotlight feature</p>
            </div>
          </div>
          <div className="max-w-xs">
            <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Featured Salon Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₹</span>
              <input
                type="number"
                value={settings.featured_salon_price}
                onChange={(e) => updateField("featured_salon_price", Math.max(0, Number(e.target.value)))}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <DollarSign size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111] text-[15px]">Subscription Plans</h3>
              <p className="text-[12px] text-[#6B7280]">Free and Pro plan configurations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Free Plan - Scans Limit</label>
              <input
                type="number"
                value={settings.free_plan_scans}
                onChange={(e) => updateField("free_plan_scans", Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Pro Plan - Scans Limit</label>
              <input
                type="number"
                value={settings.pro_plan_scans}
                onChange={(e) => updateField("pro_plan_scans", Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-[#111] mb-1.5 block">Pro Plan - Price (₹/mo)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">₹</span>
                <input
                  type="number"
                  value={settings.pro_plan_price}
                  onChange={(e) => updateField("pro_plan_price", Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
              <Bell size={18} className="text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111] text-[15px]">Notification Settings</h3>
              <p className="text-[12px] text-[#6B7280]">Admin notification preferences</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { key: "email_notifications" as const, label: "Email Notifications", desc: "Receive email updates for platform activity" },
              { key: "new_claim_notifications" as const, label: "New Claim Alerts", desc: "Get notified when a new ownership claim is submitted" },
              { key: "new_salon_notifications" as const, label: "New Salon Alerts", desc: "Get notified when a new salon registers" },
              { key: "maintenance_mode" as const, label: "Maintenance Mode", desc: "Put the platform in maintenance mode (customers see maintenance page)" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[13px] font-medium text-[#111]">{item.label}</p>
                  <p className="text-[12px] text-[#6B7280]">{item.desc}</p>
                </div>
                <button
                  onClick={() => updateField(item.key, !settings[item.key])}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                    settings[item.key] ? "bg-[#FF4FA2]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      settings[item.key] ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
