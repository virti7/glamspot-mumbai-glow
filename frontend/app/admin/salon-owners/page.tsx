"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import {
  Store, User, Loader2, Shield, Search, Phone, Mail,
  Calendar, ArrowUpRight, XCircle, CheckCircle, AlertTriangle,
  RefreshCw, UserCheck, ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface SalonOwner {
  id: string;
  name: string;
  slug: string;
  is_claimed: boolean;
  claimed_at: string | null;
  owner_id: string | null;
  owner: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
  } | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
}

export default function SalonOwnersPage() {
  const { profile } = useAuth();
  const [salons, setSalons] = useState<SalonOwner[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [transferModal, setTransferModal] = useState<{ salon: SalonOwner } | null>(null);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [removeConfirm, setRemoveConfirm] = useState<{ salon: SalonOwner } | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [salonData, userData] = await Promise.all([
        api.get<SalonOwner[]>("/admin/salon-owners"),
        api.get<Profile[]>("/admin/users"),
      ]);
      setSalons(salonData);
      setUsers(userData.filter((u) => u.role !== "admin"));
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (profile?.role === "admin") fetchData(); }, [profile]);

  const handleTransfer = async () => {
    if (!transferModal || !selectedOwner) return;
    setTransferring(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/salon-owners/transfer", {
        salon_id: transferModal.salon.id,
        new_owner_id: selectedOwner,
      });
      setSuccess(`Ownership transferred successfully`);
      setTransferModal(null);
      setSelectedOwner("");
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  const handleRemove = async () => {
    if (!removeConfirm) return;
    setRemoving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/admin/salon-owners/remove", {
        salon_id: removeConfirm.salon.id,
      });
      setSuccess(`Ownership removed. Salon is now unclaimed.`);
      setRemoveConfirm(null);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to remove ownership");
    } finally {
      setRemoving(false);
    }
  };

  const filtered = salons.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.owner?.full_name?.toLowerCase().includes(q) ||
      s.owner?.email?.toLowerCase().includes(q) ||
      s.owner?.phone?.includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-sm">
              <UserCheck size={16} className="text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900">Salon Owners</h1>
            <span className="text-[13px] text-gray-400 font-medium ml-1">({salons.filter((s) => s.is_claimed).length} claimed)</span>
          </div>
          <p className="text-[13px] text-gray-500 mt-1">Manage salon ownership assignments</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle size={15} className="text-green-600" />
          </div>
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium flex items-center gap-2.5">
          <AlertTriangle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by salon name, owner name, email, or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" />
          <p className="font-medium text-[14px]">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <Store size={32} className="text-gray-300" />
          </div>
          <p className="font-medium text-[14px] text-gray-500">No owned salons found</p>
          <p className="text-[12px] mt-1 text-gray-400">No salons have been claimed yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((salon) => (
            <div key={salon.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-sm shrink-0">
                      <Store size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold text-gray-900 truncate">{salon.name}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {salon.is_claimed ? (
                          <span className="flex items-center gap-1">
                            <Crown size={10} className="text-amber-500" />
                            Claimed
                          </span>
                        ) : (
                          "Not claimed"
                        )}
                      </p>
                    </div>
                  </div>
                  {salon.is_claimed && (
                    <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold border border-green-200 shrink-0 ml-2 flex items-center gap-1">
                      <CheckCircle size={10} />
                      Owner Assigned
                    </span>
                  )}
                </div>

                {salon.owner ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                      {salon.owner.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{salon.owner.full_name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail size={9} />
                          {salon.owner.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={9} />
                          {salon.owner.phone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User size={15} className="text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-amber-600">No owner assigned</p>
                      <p className="text-[11px] text-gray-400">Salon is unclaimed</p>
                    </div>
                  </div>
                )}

                {salon.claimed_at && (
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <Calendar size={9} />
                    Claimed {new Date(salon.claimed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <Link
                  href={`/salons/${salon.slug}`}
                  target="_blank"
                  className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition"
                  title="View Salon"
                >
                  <ExternalLink size={14} />
                </Link>
                {salon.owner && (
                  <>
                    <button
                      onClick={() => setTransferModal({ salon })}
                      className="flex-1 py-1.5 rounded-lg bg-white border border-violet-200 text-violet-600 text-[11px] font-semibold hover:bg-violet-50 transition flex items-center justify-center gap-1"
                    >
                      <ArrowUpRight size={12} />
                      Transfer
                    </button>
                    <button
                      onClick={() => setRemoveConfirm({ salon })}
                      className="flex-1 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-50 transition flex items-center justify-center gap-1"
                    >
                      <XCircle size={12} />
                      Remove
                    </button>
                  </>
                )}
                {!salon.owner && (
                  <span className="text-[11px] text-gray-400 ml-auto">No actions available</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTransferModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <ArrowUpRight size={20} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-gray-900">Transfer Ownership</h3>
                <p className="text-[13px] text-gray-500">
                  Transfer <strong>{transferModal.salon.name}</strong> to a new owner
                </p>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[12px] mb-4 flex items-center gap-2">
                <AlertTriangle size={13} />
                No users available to transfer ownership to.
              </div>
            ) : (
              <div className="space-y-1 mb-4 max-h-60 overflow-y-auto">
                {users.map((u) => {
                  const isSelected = selectedOwner === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedOwner(u.id)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        isSelected
                          ? "border-violet-200 bg-violet-50"
                          : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] font-medium truncate ${isSelected ? "text-violet-700" : "text-gray-900"}`}>
                            {u.full_name}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        </div>
                        {isSelected && <CheckCircle size={16} className="text-violet-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setTransferModal(null); setSelectedOwner(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedOwner || transferring}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {transferring ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                {transferring ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setRemoveConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-gray-900">Remove Ownership?</h3>
                <p className="text-[13px] text-gray-500">
                  This will remove <strong>{removeConfirm.salon.owner?.full_name}</strong> as owner of <strong>{removeConfirm.salon.name}</strong>
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800">
                The salon will become unclaimed. The previous owner will lose access to manage this salon. This action can be reversed by assigning a new owner.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                {removing ? "Removing..." : "Remove Owner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
