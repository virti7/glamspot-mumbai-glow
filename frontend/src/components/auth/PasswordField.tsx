"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  label: string;
  placeholder: string;
  id: string;
}

export function PasswordField({ label, placeholder, id }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-[#111] mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="w-full h-[46px] pl-10 pr-10 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]/10 transition-all"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
