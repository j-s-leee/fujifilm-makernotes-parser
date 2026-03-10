"use client";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/login/actions";

interface GoogleSignInButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg";
}

export function GoogleSignInButton({ className, size = "default" }: GoogleSignInButtonProps) {
  return (
    <form action={signInWithGoogle}>
      <Button variant="outline" className={className} size={size} type="submit">
        Continue with Google
      </Button>
    </form>
  );
}
