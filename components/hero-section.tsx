"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

export function HeroSection({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
