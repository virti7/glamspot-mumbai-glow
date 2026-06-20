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
import { BookingModal } from "@/components/BookingModal";
import { SALONS } from "@/data/salons";

export default function Index() {
  const [booking, setBooking] = useState<{ open: boolean; salon?: (typeof SALONS)[number] }>({
    open: false,
  });
  const openBooking = (s?: (typeof SALONS)[number]) => setBooking({ open: true, salon: s });
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
        <ExclusiveHairServices />
      </SectionFade>
      <div className="h-px bg-[#F5C842] mx-6 md:mx-[60px]" />
      <SectionFade>
        <SalonDiscovery onBook={openBooking} />
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
      {booking.open && <BookingModal salon={booking.salon} onClose={closeBooking} />}
    </div>
  );
}