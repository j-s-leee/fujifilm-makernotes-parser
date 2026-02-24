"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth-failed");
  }

  redirect(data.url);
}

export async function signInWithGitHub() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth-failed");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
