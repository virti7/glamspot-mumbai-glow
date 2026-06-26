"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center px-4">
      <div className="text-center py-16">
        <h1 className="text-lg font-semibold text-[#111827]">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 bg-[#EC4899] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 border border-[#E5E7EB] text-[#6B7280] rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#FAFAFB] hover:text-[#111827] transition-all"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}