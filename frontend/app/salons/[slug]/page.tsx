import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalonDetailClient } from "./SalonDetailClient";

async function getSalon(slug: string) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    const res = await fetch(`${apiBase}/salons/slug/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalon(slug);

  if (!salon) {
    return { title: "Salon Not Found | GlamSpot" };
  }

  return {
    title: `${salon.name} ${salon.city} | GlamSpot`,
    description:
      salon.description ||
      `Book ${salon.name} in ${salon.city}. View ratings, reviews, services and prices.`,
    openGraph: {
      title: `${salon.name} — GlamSpot`,
      description:
        salon.description ||
        `Book ${salon.name} in ${salon.city}. View ratings, reviews, services and prices.`,
      images: salon.cover_image ? [{ url: salon.cover_image }] : [],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getSalon(slug);

  if (!salon) notFound();

  return <SalonDetailClient salon={salon} />;
}
