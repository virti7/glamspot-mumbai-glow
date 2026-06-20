import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlamSpot — Mumbai's #1 Salon Platform",
  description:
    "Discover, compare and book Mumbai's finest salons — powered by GlamAI hair & skin diagnosis.",
  authors: [{ name: "SuperXgen AI" }],
  openGraph: {
    title: "GlamSpot — Mumbai's Beauty OS",
    description:
      "Skip the Instagram DMs. Find, compare and book top salons near you — powered by AI.",
    type: "website",
  },
  twitter: {
    card: "summary",
    site: "@glamspotmumbai",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,700;1,900&family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}