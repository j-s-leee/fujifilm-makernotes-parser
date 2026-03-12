"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { RecipeSettingsModal } from "@/components/recipe-settings-modal";
import { DeleteRecipeDialog } from "@/components/delete-recipe-dialog";
import { ReportRecipeDialog } from "@/components/report-recipe-dialog";
import { CollectionPopover } from "@/components/bookmark-popover";
import type { RecipeSettingsRecipe } from "@/components/recipe-settings";

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
  };
  settingsRecipe: RecipeSettingsRecipe;
  sharer: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export function RecipeHero({
  recipe,
  settingsRecipe,
  sharer,
}: RecipeHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const { user } = useUser();
  const isOwner = user?.id === sharer?.userId;
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
    const url = `${window.location.origin}/recipes/${recipe.id}`;
    if (navigator.share) {
      navigator.share({ title: recipe.simulation ?? "Recipe", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const bookmarkCount = recipe.bookmark_count;

  return (
    <div className="flex flex-col gap-4">
      {/* Photo */}
      {thumbnailUrl ? (
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
          No image
        </div>
      )}

      {/* Metadata & Author card */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        {/* Row 1: Author + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                by{" "}
                <span className="font-medium">
                  {sharer.username ? `@${sharer.username}` : sharer.displayName}
                </span>
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">
                by Anonymous
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => toggleLike(recipe.id)}
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
            <CollectionPopover recipeId={recipe.id}>
              <button className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <FolderPlus className="h-4 w-4" />
              </button>
            </CollectionPopover>
            <button
              onClick={handleShare}
              className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner ? (
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setReportOpen(true)}>
                      <Flag className="h-4 w-4" />
                      Report
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
          View Recipe
        </button>
      </div>

      <RecipeSettingsModal
        recipe={settingsRecipe}
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
