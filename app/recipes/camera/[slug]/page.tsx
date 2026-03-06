import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { GalleryGrid } from "@/components/gallery-grid";
import { fromCameraSlug, toSlug } from "@/lib/slug";
import { ALL_CAMERA_MODELS } from "@/fujifilm/cameras";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const camera = fromCameraSlug(slug);
  if (!camera) return {};

  return {
    title: `${camera} Recipes`,
    description: `Browse Fujifilm ${camera} film simulation recipes shared by the community.`,
  };
}

export default async function CameraPage({ params }: Props) {
  const { slug } = await params;
  const camera = fromCameraSlug(slug);

  if (!camera) notFound();

  const supabase = createStaticClient();

  const { data: recipes } = await supabase
    .from("recipes_with_stats")
    .select("*")
    .eq("camera_model", camera)
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{camera}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Film simulation recipes shot on {camera}
          </p>
        </div>
        {recipes && recipes.length > 0 ? (
          <GalleryGrid initialRecipes={recipes} />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            No recipes found for {camera}.
          </p>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return ALL_CAMERA_MODELS.map((m) => ({ slug: toSlug(m) }));
}
