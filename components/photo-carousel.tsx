"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";

export interface CarouselPhoto {
  src: string;
  blurDataUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
}

interface PhotoCarouselProps {
  photos: CarouselPhoto[];
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const dragX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const paginate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setActiveIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return 0;
        if (next >= photos.length) return photos.length - 1;
        return next;
      });
    },
    [photos.length],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") paginate(-1);
      if (e.key === "ArrowRight") paginate(1);
    },
    [paginate],
  );

  const currentPhoto = photos[activeIndex];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <LazyMotion features={domAnimation}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl shadow-lg"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-roledescription="carousel"
        aria-label="Recipe photos"
      >
        {/* Image area */}
        <div
          className="relative touch-pan-y"
          onPointerDown={() => { dragX.current = 0; }}
          onPointerMove={(e) => {
            if (e.buttons > 0) dragX.current += e.movementX;
          }}
          onPointerUp={() => {
            if (dragX.current > 60) paginate(-1);
            else if (dragX.current < -60) paginate(1);
            dragX.current = 0;
          }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <m.div
              key={activeIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Image
                src={currentPhoto.src}
                alt={currentPhoto.alt}
                width={currentPhoto.width ?? 600}
                height={currentPhoto.height ?? 600}
                className="w-full object-cover"
                sizes="(max-width: 600px) 100vw, 50vw"
                priority={activeIndex === 0}
                placeholder={currentPhoto.blurDataUrl ? "blur" : "empty"}
                blurDataURL={currentPhoto.blurDataUrl ?? undefined}
              />
            </m.div>
          </AnimatePresence>
        </div>

        {/* Left arrow */}
        {activeIndex > 0 && (
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right arrow */}
        {activeIndex < photos.length - 1 && (
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > activeIndex ? 1 : -1);
                setActiveIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </LazyMotion>
  );
}
