"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  function handleSwitch() {
    const nextLocale = locale === "en" ? "ko" : "en";
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSwitch} className="text-xs">
      {locale === "en" ? "한" : "EN"}
    </Button>
  );
}
