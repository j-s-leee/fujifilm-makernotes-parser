import { ADSENSE_CLIENT } from "@/lib/adsense";

export const dynamic = "force-static";

export function GET() {
  // ads.txt expects "pub-XXXX" (without the "ca-" prefix used by the ad tag)
  const body = ADSENSE_CLIENT
    ? `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
    : "";

  return new Response(body, {
    status: ADSENSE_CLIENT ? 200 : 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
