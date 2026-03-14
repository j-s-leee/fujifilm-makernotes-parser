const BASE_URL = "https://film-simulation.site";

/**
 * Build `alternates` metadata for hreflang tags.
 * en (default) → no prefix, ko → /ko prefix.
 */
export function getAlternates(pathname: string) {
  return {
    canonical: `${BASE_URL}${pathname}`,
    languages: {
      en: `${BASE_URL}${pathname}`,
      ko: `${BASE_URL}/ko${pathname}`,
      "x-default": `${BASE_URL}${pathname}`,
    },
  };
}
