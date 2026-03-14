"use client";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/actions/auth";
import { useTranslations } from "next-intl";

interface GoogleSignInButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg";
  next?: string;
}

export function GoogleSignInButton({ className, size = "default", next }: GoogleSignInButtonProps) {
  const t = useTranslations("auth");

  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <Button variant="outline" className={className} size={size} type="submit">
        {t("continueWithGoogle")}
      </Button>
    </form>
  );
}
