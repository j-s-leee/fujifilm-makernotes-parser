"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserInteractionsContextValue {
  bookmarks: Set<number>;
  likes: Set<number>;
  likeCounts: Map<number, number>;
  isLoaded: boolean;
  toggleBookmark: (recipeId: number, e?: React.MouseEvent) => Promise<void>;
  toggleLike: (recipeId: number, e?: React.MouseEvent) => Promise<void>;
  mergeLikeCounts: (
    recipes: { id: number; like_count: number }[],
  ) => void;
}

const UserInteractionsContext =
  createContext<UserInteractionsContextValue | null>(null);

export function useUserInteractions() {
  const ctx = useContext(UserInteractionsContext);
  if (!ctx) {
    throw new Error(
      "useUserInteractions must be used within UserInteractionsProvider",
    );
  }
  return ctx;
}

export function UserInteractionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [likes, setLikes] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<number, number>>(
    new Map(),
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setBookmarks(new Set());
      setLikes(new Set());
      setIsLoaded(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function fetchInteractions() {
      const [{ data: bmarks }, { data: lks }] = await Promise.all([
        supabase
          .from("bookmarks")
          .select("recipe_id")
          .eq("user_id", user!.id),
        supabase
          .from("likes")
          .select("recipe_id")
          .eq("user_id", user!.id),
      ]);

      if (cancelled) return;
      setBookmarks(new Set(bmarks?.map((b) => b.recipe_id) ?? []));
      setLikes(new Set(lks?.map((l) => l.recipe_id) ?? []));
      setIsLoaded(true);
    }

    fetchInteractions();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleBookmark = useCallback(
    async (recipeId: number, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      if (!user) {
        toast({ description: "Sign in to bookmark recipes" });
        return;
      }

      const supabase = createClient();
      const isBookmarked = bookmarks.has(recipeId);

      if (isBookmarked) {
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        await supabase
          .from("bookmarks")
          .delete()
          .match({ user_id: user.id, recipe_id: recipeId });
      } else {
        setBookmarks((prev) => new Set(prev).add(recipeId));
        await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, recipe_id: recipeId });
      }
    },
    [user, bookmarks, toast],
  );

  const toggleLike = useCallback(
    async (recipeId: number, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      if (!user) {
        toast({ description: "Sign in to like recipes" });
        return;
      }

      const supabase = createClient();
      const isLiked = likes.has(recipeId);

      if (isLiked) {
        setLikes((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        setLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(recipeId, (next.get(recipeId) ?? 0) - 1);
          return next;
        });
        await supabase
          .from("likes")
          .delete()
          .match({ user_id: user.id, recipe_id: recipeId });
      } else {
        setLikes((prev) => new Set(prev).add(recipeId));
        setLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(recipeId, (next.get(recipeId) ?? 0) + 1);
          return next;
        });
        await supabase
          .from("likes")
          .insert({ user_id: user.id, recipe_id: recipeId });
      }
    },
    [user, likes, toast],
  );

  const mergeLikeCounts = useCallback(
    (recipes: { id: number; like_count: number }[]) => {
      setLikeCounts((prev) => {
        const next = new Map(prev);
        for (const r of recipes) {
          if (!next.has(r.id)) next.set(r.id, r.like_count);
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      bookmarks,
      likes,
      likeCounts,
      isLoaded,
      toggleBookmark,
      toggleLike,
      mergeLikeCounts,
    }),
    [
      bookmarks,
      likes,
      likeCounts,
      isLoaded,
      toggleBookmark,
      toggleLike,
      mergeLikeCounts,
    ],
  );

  return (
    <UserInteractionsContext.Provider value={value}>
      {children}
    </UserInteractionsContext.Provider>
  );
}
