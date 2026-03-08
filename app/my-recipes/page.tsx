import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthPrompt } from "@/components/auth-prompt";

export default async function MyRecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="My Recipes"
        description="Sign in to view your shared recipes."
      />
    );
  }

  redirect(`/u/${user.id}`);
}
