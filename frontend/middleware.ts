import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

const userRoutes = [
  "/dashboard",
  "/profile",
  "/bookings",
  "/favorites",
  "/glamai",
  "/subscription",
  "/salons",
];

const salonOwnerRoutes = [
  "/salon-dashboard",
];

const adminRoutes = [
  "/admin",
];

function isPublicRoute(path: string): boolean {
  return publicRoutes.some((route) => path === route || path.startsWith(route + "/"));
}

function isProtectedRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => path === route || path.startsWith(route + "/"));
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("glamspot_token")?.value;
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (
    isProtectedRoute(pathname, userRoutes) ||
    isProtectedRoute(pathname, salonOwnerRoutes) ||
    isProtectedRoute(pathname, adminRoutes)
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
