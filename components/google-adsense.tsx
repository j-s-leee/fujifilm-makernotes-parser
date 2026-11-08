import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/adsense";

/**
 * Loads the AdSense library site-wide. Required for site review and for
 * any ad unit to render. Renders nothing when the publisher ID is unset.
 */
export function GoogleAdSense() {
  if (!ADSENSE_CLIENT) return null;

  return (
    <Script
      id="adsbygoogle-init"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
