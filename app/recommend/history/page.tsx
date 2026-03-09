import { createClient } from "@/lib/supabase/server";
import { AuthPrompt } from "@/components/auth-prompt";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function RecommendHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthPrompt
        title="Recommendation History"
        description="Sign in to view your past recipe recommendations."
      />
    );
  }

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("id, image_path, image_width, image_height, blur_data_url, query_text, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = recommendations ?? [];
  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Recommendation History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your past recipe recommendation searches
          </p>
        </div>

        {items.length > 0 ? (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {items.map((item) => {
              const date = item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "";
              const isTextSearch = !item.image_path && item.query_text;

              if (isTextSearch) {
                return (
                  <Link
                    key={item.id}
                    href={`/recommend/history/${item.id}`}
                    className="group relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:bg-muted"
                  >
                    <Search className="h-6 w-6 text-muted-foreground" />
                    <p className="text-center text-sm text-foreground line-clamp-3">
                      &ldquo;{item.query_text}&rdquo;
                    </p>
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                      {date}
                    </span>
                  </Link>
                );
              }

              const src = r2Url
                ? `${r2Url}/${item.image_path}`
                : item.image_path;

              return (
                <Link
                  key={item.id}
                  href={`/recommend/history/${item.id}`}
                  className="group relative block overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={src!}
                    alt="Recommendation search"
                    width={item.image_width ?? 300}
                    height={item.image_height ?? 300}
                    className="w-full object-cover rounded-lg"
                    style={
                      item.image_width && item.image_height
                        ? { aspectRatio: `${item.image_width}/${item.image_height}` }
                        : { aspectRatio: "1/1" }
                    }
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    placeholder={item.blur_data_url ? "blur" : "empty"}
                    blurDataURL={item.blur_data_url ?? undefined}
                  />
                  <div className="absolute bottom-2 left-2">
                    <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                      {date}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recommendation history yet.
          </p>
        )}
      </div>
    </div>
  );
}
