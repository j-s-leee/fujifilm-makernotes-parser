import { createClient } from "@/lib/supabase/server";
import { AuthPrompt } from "@/components/auth-prompt";
import { RecommendPageClient } from "@/components/recommend-page-client";

export default async function RecommendPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="Recipe Recommendations"
        description="Sign in to get personalized recipe recommendations from your photos."
      />
    );
  }

  return <RecommendPageClient />;
}
