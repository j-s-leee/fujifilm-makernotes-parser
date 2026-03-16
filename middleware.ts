import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Serve SEO files from root, even if accessed with locale prefix (e.g. /ko/robots.txt)
  if (pathname.endsWith("/robots.txt") || pathname.endsWith("/sitemap.xml")) {
    const file = "/" + pathname.split("/").pop();
    return NextResponse.rewrite(new URL(file, request.url));
  }

  const response = handleI18nRouting(request);
  await updateSession(request, response);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
