"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

export function TrendingSection({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0, margin: "0px 0px 100px 0px" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
