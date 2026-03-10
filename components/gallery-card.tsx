"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, FolderPlus, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import { CollectionPopover } from "@/components/bookmark-popover";

const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

export interface GalleryRecipe {
  id: number;
  user_id: string;
  simulation: string | null;
  thumbnail_path: string | null;
  blur_data_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  bookmark_count: number;
  like_count: number;
  camera_model: string | null;
  created_at: string | null;
  user_display_name: string | null;
  user_username: string | null;
  user_avatar_path: string | null;
}

export const GalleryCard = memo(function GalleryCard({ recipe }: { recipe: GalleryRecipe }) {
  const { bookmarks, likes, likeCounts, toggleBookmark, toggleLike } =
    useUserInteractions();

  const src = recipe.thumbnail_width
    ? recipe.thumbnail_path
    : getThumbnailUrl(recipe.thumbnail_path);

  const avatarUrl = recipe.user_avatar_path
    ? `${r2Base}/${recipe.user_avatar_path}`
    : null;

  const profileHref = `/u/${recipe.user_username ?? recipe.user_id}`;
  const displayName = recipe.user_display_name ?? recipe.user_username;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="group relative overflow-hidden rounded-md">
      {/* Mobile: top bar with avatar + username */}
      <div className="flex items-center gap-2 px-2.5 py-2 sm:hidden">
        <Link
          href={profileHref}
          className="flex items-center gap-2"
        >
          <Avatar className="h-6 w-6">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName ?? "User"} />
            )}
            <AvatarFallback className="text-[10px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">
            {displayName ?? "Anonymous"}
          </span>
        </Link>
      </div>

      {/* Image */}
      <div className="relative">
        {src ? (
          <Image
            src={src}
            alt={recipe.simulation ?? "Recipe"}
            width={recipe.thumbnail_width ?? 300}
            height={recipe.thumbnail_height ?? 300}
            className="rounded-md w-full object-cover"
            style={
              recipe.thumbnail_width && recipe.thumbnail_height
                ? {
                    aspectRatio: `${recipe.thumbnail_width}/${recipe.thumbnail_height}`,
                  }
                : { aspectRatio: "1/1" }
            }
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            placeholder={recipe.blur_data_url ? "blur" : "empty"}
            blurDataURL={recipe.blur_data_url ?? undefined}
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {/* Invisible link covering the image area */}
        <Link
          href={`/recipes/${recipe.id}`}
          className="absolute inset-0 z-0"
          aria-label={recipe.simulation ?? "View recipe"}
        />

        {/* Desktop hover overlay */}
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 transition-opacity duration-200 sm:block sm:group-hover:opacity-100" />

        {/* Desktop hover: top-left avatar + username */}
        <div className="absolute left-3 top-3 z-10 hidden items-center gap-2 opacity-0 transition-opacity duration-200 sm:flex sm:group-hover:opacity-100">
          <Link
            href={profileHref}
            className="flex items-center gap-2"
          >
            <Avatar className="h-7 w-7 ring-2 ring-white/30">
              {avatarUrl && (
                <AvatarImage src={avatarUrl} alt={displayName ?? "User"} />
              )}
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white drop-shadow-sm">
              {displayName ?? "Anonymous"}
            </span>
          </Link>
        </div>

        {/* Desktop hover: bottom-right like + bookmark + collection */}
        <div className="absolute bottom-3 right-3 z-10 hidden items-center gap-2 opacity-0 transition-opacity duration-200 sm:flex sm:group-hover:opacity-100">
          <button
            onClick={(e) => toggleLike(recipe.id, e)}
            className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                likes.has(recipe.id)
                  ? "fill-red-500 text-red-500"
                  : "text-white"
              }`}
            />
            <span>{likeCounts.get(recipe.id) ?? recipe.like_count}</span>
          </button>
          <button
            onClick={(e) => toggleBookmark(recipe.id, e)}
            className="rounded-full bg-black/40 p-1.5 backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${
                bookmarks.has(recipe.id)
                  ? "fill-white text-white"
                  : "text-white"
              }`}
            />
          </button>
          <CollectionPopover recipeId={recipe.id}>
            <button
              className="rounded-full bg-black/40 p-1.5 backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <FolderPlus className="h-3.5 w-3.5 text-white" />
            </button>
          </CollectionPopover>
        </div>
      </div>

      {/* Mobile: bottom bar with like + bookmark + collection */}
      <div className="flex items-center justify-between px-2.5 py-2 sm:hidden">
        <button
          onClick={(e) => toggleLike(recipe.id, e)}
          className="flex items-center gap-1 text-xs"
        >
          <Heart
            className={`h-4 w-4 ${
              likes.has(recipe.id)
                ? "fill-red-500 text-red-500"
                : "text-muted-foreground"
            }`}
          />
          <span className="text-muted-foreground">
            {likeCounts.get(recipe.id) ?? recipe.like_count}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={(e) => toggleBookmark(recipe.id, e)}>
            <Bookmark
              className={`h-4 w-4 ${
                bookmarks.has(recipe.id)
                  ? "fill-foreground text-foreground"
                  : "text-muted-foreground"
              }`}
            />
          </button>
          <CollectionPopover recipeId={recipe.id}>
            <button onClick={(e) => e.stopPropagation()}>
              <FolderPlus className="h-4 w-4 text-muted-foreground" />
            </button>
          </CollectionPopover>
        </div>
      </div>
    </div>
  );
});
