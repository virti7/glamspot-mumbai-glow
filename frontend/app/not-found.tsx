import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center px-4">
      <div className="text-center py-16">
        <h1 className="text-7xl font-bold text-[#111827]">404</h1>
        <h2 className="mt-4 text-lg font-semibold text-[#111827]">Page not found</h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#EC4899] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#DB2777] transition-all hover:shadow-lg hover:shadow-[#EC4899]/25"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}