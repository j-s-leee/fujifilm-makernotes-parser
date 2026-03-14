"use client";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/actions/auth";

interface GoogleSignInButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg";
  next?: string;
}

export function GoogleSignInButton({ className, size = "default", next }: GoogleSignInButtonProps) {
  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <Button variant="outline" className={className} size={size} type="submit">
        Continue with Google
      </Button>
    </form>
  );
}
