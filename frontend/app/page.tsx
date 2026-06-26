"use client";

import { useState } from "react";

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { SectionFade } from "@/components/SectionFade";
import { ReelsStrip } from "@/components/ReelsStrip";
import { GlamAI } from "@/components/GlamAI";
import { WhatWeDo } from "@/components/WhatWeDo";
import { ExclusiveHairServices } from "@/components/ExclusiveHairServices";
import { SalonDiscovery } from "@/components/SalonDiscovery";
import { Team } from "@/components/Team";
import { Tour360 } from "@/components/Tour360";
import { Testimonials } from "@/components/Testimonials";
import { Brands } from "@/components/Brands";
import { Footer } from "@/components/Footer";
import { BookingFlow } from "@/components/BookingFlow";
import { SALONS } from "@/data/salons";

function mapSalonForBooking(s: (typeof SALONS)[number]): React.ComponentProps<typeof BookingFlow>["salon"] {
  return {
    id: String(s.id),
    name: s.name,
    slug: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    description: null,
    address: s.locality + ", Mumbai",
    locality: s.locality,
    city: "Mumbai",
    cover_image: s.image,
    rating: s.rating,
    reviews_count: s.reviews,
    opening_time: "10:00",
    closing_time: "19:00",
  };
}

export default function Index() {
  const [booking, setBooking] = useState<{ open: boolean; salon?: ReturnType<typeof mapSalonForBooking> }>({
    open: false,
  });
  const openBooking = (s?: (typeof SALONS)[number]) => setBooking({ open: true, salon: s ? mapSalonForBooking(s) : mapSalonForBooking(SALONS[0]) });
  const closeBooking = () => setBooking({ open: false });

  return (
    <div className="font-body bg-white text-[#111]">
      <Navbar onBook={() => openBooking(SALONS[0])} />
      <Hero onBook={() => openBooking()} />
      <SectionFade>
        <ReelsStrip />
      </SectionFade>
      <SectionFade>
        <GlamAI />
      </SectionFade>
      <SectionFade>
        <WhatWeDo />
      </SectionFade>
      <SectionFade>
        <ExclusiveHairServices onBook={() => openBooking(SALONS[0])} />
      </SectionFade>
      <div className="h-px bg-[#F5C842] mx-6 md:mx-[60px]" />
      <SectionFade>
        <SalonDiscovery onBook={(s) => openBooking(s)} />
      </SectionFade>
      <SectionFade>
        <Team />
      </SectionFade>
      <div className="h-px bg-[#F5C842] mx-6 md:mx-[60px]" />
      <SectionFade>
        <Tour360 />
      </SectionFade>
      <SectionFade>
        <Testimonials />
      </SectionFade>
      <SectionFade>
        <Brands />
      </SectionFade>
      <Footer />
      {booking.open && <BookingFlow salon={booking.salon!} onClose={closeBooking} onSuccess={() => closeBooking()} />}
    </div>
  );
}