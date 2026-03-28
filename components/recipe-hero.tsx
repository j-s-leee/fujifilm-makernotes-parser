"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Heart,
  Bookmark,
  FolderPlus,
  Share2,
  NotebookText,
  MoreHorizontal,
  Trash2,
  Flag,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { useUser } from "@/hooks/use-user";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import { toSlug } from "@/lib/slug";
import dynamic from "next/dynamic";
import type { RecipeSettingsRecipe } from "@/components/recipe-settings";
import { useTranslations } from "next-intl";
import { PhotoCarousel } from "@/components/photo-carousel";
import type { CarouselPhoto } from "@/components/photo-carousel";

const CollectionPopover = dynamic(
  () =>
    import("@/components/bookmark-popover").then((m) => m.CollectionPopover),
  { ssr: false },
);
const RecipeSettingsModal = dynamic(
  () =>
    import("@/components/recipe-settings-modal").then(
      (m) => m.RecipeSettingsModal,
    ),
  { ssr: false },
);
const DeleteRecipeDialog = dynamic(
  () =>
    import("@/components/delete-recipe-dialog").then(
      (m) => m.DeleteRecipeDialog,
    ),
  { ssr: false },
);
const ReportRecipeDialog = dynamic(
  () =>
    import("@/components/report-recipe-dialog").then(
      (m) => m.ReportRecipeDialog,
    ),
  { ssr: false },
);

interface RecipeHeroProps {
  recipe: {
    id: number;
    simulation: string | null;
    thumbnail_path: string | null;
    blur_data_url: string | null;
    thumbnail_width: number | null;
    camera_model: string | null;
    lens_model: string | null;
    bookmark_count: number;
    like_count: number;
    slug: string;
  };
  settings: RecipeSettingsRecipe;
  sharer: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  photos?: CarouselPhoto[];
}

export function RecipeHero({ recipe, settings, sharer, photos }: RecipeHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { user } = useUser();
  const isOwner = user?.id === sharer?.userId;
  const t = useTranslations("recipeHero");
  const tCommon = useTranslations("common");
  const {
    bookmarks,
    likes,
    likeCounts,
    toggleBookmark,
    toggleLike,
    mergeLikeCounts,
  } = useUserInteractions();

  useEffect(() => {
    mergeLikeCounts([recipe]);
  }, [recipe, mergeLikeCounts]);

  // New images → pass path for loader; legacy → pass full R2 URL
  const thumbnailUrl = recipe.thumbnail_width
    ? recipe.thumbnail_path
    : getThumbnailUrl(recipe.thumbnail_path);
  const isBookmarked = bookmarks.has(recipe.id);
  const isLiked = likes.has(recipe.id);
  const likeCount = likeCounts.get(recipe.id) ?? recipe.like_count;

  const sharerInitials = sharer
    ? sharer.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const profileHref = sharer
    ? `/u/${sharer.username ?? sharer.userId}`
    : undefined;

  const handleShare = async () => {
    const url = `${window.location.origin}/recipes/${recipe.slug}-${recipe.id}`;
    if (navigator.share) {
      navigator.share({ title: recipe.simulation ?? "Recipe", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const bookmarkCount = recipe.bookmark_count;

  return (
    <div className="flex flex-col gap-4">
      {/* Photo(s) */}
      {photos && photos.length > 1 ? (
        <PhotoCarousel photos={photos} />
      ) : thumbnailUrl ? (
        <div className="relative w-full overflow-hidden rounded-xl shadow-lg">
          <Image
            src={thumbnailUrl}
            alt={recipe.simulation ?? "Recipe photo"}
            width={600}
            height={600}
            className="w-full object-cover"
            sizes="(max-width: 600px) 100vw, 50vw"
            priority
            placeholder={recipe.blur_data_url ? "blur" : "empty"}
            blurDataURL={recipe.blur_data_url ?? undefined}
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          {tCommon("noImage")}
        </div>
      )}

      {/* Metadata & Author card */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {/* Row 1: Author + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {sharer ? (
              <Link href={profileHref!} className="shrink-0">
                <Avatar className="h-8 w-8">
                  {sharer.avatarUrl && (
                    <AvatarImage
                      src={sharer.avatarUrl}
                      alt={sharer.displayName}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {sharerInitials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="h-8 w-8 ring-2 ring-border">
                <AvatarFallback className="text-xs">?</AvatarFallback>
              </Avatar>
            )}
            {sharer ? (
              <Link
                href={profileHref!}
                className="truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("byUser")}{" "}
                <span className="font-medium">
                  {sharer.username ? `@${sharer.username}` : sharer.displayName}
                </span>
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("byAnonymous")}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => toggleLike(recipe.id)}
              aria-label={tCommon("like")}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Heart
                className={`h-4 w-4 ${
                  isLiked ? "fill-red-500 text-red-500" : ""
                }`}
              />
              {likeCount > 0 && (
                <span className={`text-xs ${isLiked ? "text-red-500" : ""}`}>
                  {likeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => toggleBookmark(recipe.id)}
              aria-label={tCommon("bookmark")}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bookmark
                className={`h-4 w-4 ${
                  isBookmarked ? "fill-foreground text-foreground" : ""
                }`}
              />
              {bookmarkCount > 0 && (
                <span className="text-xs">{bookmarkCount}</span>
              )}
            </button>
            <CollectionPopover recipeId={recipe.id} recipeThumbnailUrl={getThumbnailUrl(recipe.thumbnail_path, 64, !!recipe.thumbnail_width)}>
              <button aria-label={tCommon("addToCollection")} className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <FolderPlus className="h-4 w-4" />
              </button>
            </CollectionPopover>
            <button
              onClick={handleShare}
              aria-label={tCommon("share")}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button aria-label={tCommon("moreOptions")} className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner ? (
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setReportOpen(true)}>
                      <Flag className="h-4 w-4" />
                      {t("report")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Row 2: Camera & Lens chips */}
        {(recipe.camera_model || recipe.lens_model) && (
          <div className="flex flex-wrap items-center gap-2">
            {recipe.camera_model && (
              <Link
                href={`/recipes/camera/${toSlug(recipe.camera_model)}`}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                # {recipe.camera_model}
              </Link>
            )}
            {recipe.lens_model && (
              <Link
                href={`/recipes/lens/${toSlug(recipe.lens_model)}`}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                # {recipe.lens_model}
              </Link>
            )}
          </div>
        )}

        {/* Row 3: View Recipe Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <NotebookText className="h-4 w-4" />
          {t("viewRecipe")}
        </button>
      </div>

      <RecipeSettingsModal
        recipe={settings}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <DeleteRecipeDialog
        recipeId={recipe.id}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <ReportRecipeDialog
        recipeId={recipe.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}
