"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Lock, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUser } from "@/hooks/use-user";
import { useCollections } from "@/contexts/collections-context";
import { useUserInteractions } from "@/contexts/user-interactions-context";
import { createClient } from "@/lib/supabase/client";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import { toast } from "sonner";
import { CollectionCreateDialog } from "@/components/collection-create-dialog";

interface CollectionPopoverProps {
  recipeId: number;
  recipeThumbnailUrl?: string | null;
  children: React.ReactNode;
}

export function CollectionPopover({ recipeId, recipeThumbnailUrl, children }: CollectionPopoverProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const { user } = useUser();
  const { collections, isLoaded: collectionsLoaded, refreshCollections } = useCollections();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [covers, setCovers] = useState<Map<number, string>>(new Map());
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [countAdj, setCountAdj] = useState<Map<number, number>>(new Map());

  // Fetch membership + cover thumbnails when popover opens
  const fetchMembership = useCallback(async () => {
    if (!user || !open) return;
    setLoadingMembership(true);
    const supabase = createClient();

    const collectionIds = collections.map((c) => c.id);

    // Parallel: membership check + cover images
    const [membershipRes, coversRes] = await Promise.all([
      supabase
        .from("collection_items")
        .select("collection_id")
        .eq("recipe_id", recipeId),
      collectionIds.length > 0
        ? supabase
            .from("collection_items")
            .select("collection_id, recipe:recipes(id, thumbnail_path, thumbnail_width)")
            .in("collection_id", collectionIds)
            .order("created_at", { ascending: false })
            .limit(collectionIds.length)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    setCheckedIds(new Set((membershipRes.data ?? []).map((d) => d.collection_id)));

    // Build cover map: one thumbnail per collection (first/newest item)
    const coverMap = new Map<number, string>();
    for (const item of coversRes.data ?? []) {
      if (coverMap.has(item.collection_id)) continue;
      const recipe = item.recipe as unknown as {
        id: number;
        thumbnail_path: string | null;
        thumbnail_width: number | null;
      } | null;
      if (!recipe?.thumbnail_path) continue;
      const url = recipe.thumbnail_width
        ? getThumbnailUrl(recipe.thumbnail_path, 64, true)
        : getThumbnailUrl(recipe.thumbnail_path);
      if (url) coverMap.set(item.collection_id, url);
    }
    setCovers(coverMap);
    setLoadingMembership(false);
  }, [user, open, recipeId, collections]);

  // Only fetch when popover first opens, not when collections change mid-session
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      fetchMembership();
    }
    prevOpenRef.current = open;
  }, [open, fetchMembership]);

  const handleToggleCollection = async (
    collectionId: number,
    checked: boolean,
    name?: string,
  ) => {
    const prevChecked = new Set(checkedIds);
    const prevCovers = new Map(covers);
    const collectionName = name ?? collections.find((c) => c.id === collectionId)?.name;
    const delta = checked ? 1 : -1;

    // Optimistic update: checkedIds + item count + cover thumbnail
    setCheckedIds((s) => {
      const next = new Set(s);
      if (checked) next.add(collectionId);
      else next.delete(collectionId);
      return next;
    });
    setCountAdj((m) => {
      const next = new Map(m);
      next.set(collectionId, (next.get(collectionId) ?? 0) + delta);
      return next;
    });
    if (checked && recipeThumbnailUrl) {
      setCovers((m) => new Map(m).set(collectionId, recipeThumbnailUrl));
    }

    const supabase = createClient();
    try {
      if (checked) {
        const { error } = await supabase
          .from("collection_items")
          .insert({ collection_id: collectionId, recipe_id: recipeId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("collection_items")
          .delete()
          .match({ collection_id: collectionId, recipe_id: recipeId });
        if (error) throw error;
      }
      toast.success(
        checked
          ? `Added to ${collectionName}`
          : `Removed from ${collectionName}`,
      );
      // Sync real counts from DB, then clear local adjustments
      refreshCollections().then(() => setCountAdj(new Map()));
    } catch {
      setCheckedIds(prevChecked);
      setCovers(prevCovers);
      setCountAdj((m) => {
        const next = new Map(m);
        next.set(collectionId, (next.get(collectionId) ?? 0) - delta);
        return next;
      });
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleCreated = (collection: { id: number; name: string }) => {
    handleToggleCollection(collection.id, true, collection.name);
  };

  const popoverContent = (
    <div
      className="flex flex-col"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Collection list */}
      <div className="max-h-48 overflow-y-auto py-1">
        {!collectionsLoaded || loadingMembership ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
        ) : collections.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">No collections yet</div>
        ) : (
          collections.map((c) => {
            const isAdded = checkedIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleToggleCollection(c.id, !isAdded)}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {covers.get(c.id) ? (
                    <Image
                      src={covers.get(c.id)!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="32px"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm">{c.name}</span>
                    {!c.is_public && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{c.item_count + (countAdj.get(c.id) ?? 0)} recipes</span>
                </div>
                {isAdded ? (
                  <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Create new */}
      <div className="border-t border-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCreateOpen(true);
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span>New Collection</span>
        </button>
      </div>

      <CollectionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );

  const { promptLogin } = useUserInteractions();

  if (!user) {
    return (
      <span
        className="inline-flex"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          promptLogin("collections");
        }}
      >
        {children}
      </span>
    );
  }

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          {popoverContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DrawerTrigger>
      <DrawerContent onClick={(e) => e.stopPropagation()}>
        <div className="px-2 pb-4">{popoverContent}</div>
      </DrawerContent>
    </Drawer>
  );
}
