import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthImagePanel } from "./AuthImagePanel";

interface AuthLayoutProps {
  children: React.ReactNode;
  imageUrl: string;
  activeDot?: number;
}

export function AuthLayout({ children, imageUrl, activeDot = 0 }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-[1100px] h-[min(92vh,680px)] flex bg-white rounded-2xl shadow-sm border border-[#E5E7EB]/60 overflow-hidden">
        <div className="w-full lg:w-[480px] flex-shrink-0 flex flex-col px-8 pt-8 pb-6 md:px-10 md:pt-9 md:pb-7 overflow-y-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] font-medium hover:text-[#EC4899] transition-colors mb-8"
          >
            <ArrowLeft size={15} />
            Back to Home
          </Link>
          {children}
        </div>
        <AuthImagePanel imageUrl={imageUrl} activeDot={activeDot} />
      </div>
    </div>
  );
}
