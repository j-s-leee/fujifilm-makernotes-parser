"use client";

import { memo, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ADSENSE_CLIENT, ADSENSE_FEED_SLOT } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Square ad card sized like a gallery card, for insertion into gallery grids.
 * Hides itself when AdSense returns no fill.
 */
export const FeedAdCard = memo(function FeedAdCard() {
  const t = useTranslations("common");
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const ins = insRef.current;
    // Guard against double push (React Strict Mode / remounts)
    if (!ins || ins.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or not-yet-approved sites: fail silently
    }
  }, []);

  return (
    <div className="feed-ad-card overflow-hidden rounded-md">
      <p className="py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:pt-0">
        {t("advertisement")}
      </p>
      <div className="aspect-square w-full overflow-hidden rounded-md bg-muted/40">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_FEED_SLOT}
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
});

export const feedAdsEnabled = Boolean(ADSENSE_CLIENT && ADSENSE_FEED_SLOT);
