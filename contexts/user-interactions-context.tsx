"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import type { LoginFeature } from "@/components/login-prompt-modal";

const LoginPromptModal = dynamic(
  () => import("@/components/login-prompt-modal").then((m) => m.LoginPromptModal),
  { ssr: false }
);

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
  promptLogin: (feature: LoginFeature) => void;
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
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [likes, setLikes] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<number, number>>(
    new Map(),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [loginPromptFeature, setLoginPromptFeature] =
    useState<LoginFeature | null>(null);
  const inflightRef = useRef<Set<string>>(new Set());

  const promptLogin = useCallback((feature: LoginFeature) => {
    setLoginPromptFeature(feature);
  }, []);

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

    // Defer fetch until after first paint to avoid blocking FCP
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = requestIdleCallback(() => {
        if (!cancelled) fetchInteractions();
      });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    } else {
      const id = setTimeout(() => {
        if (!cancelled) fetchInteractions();
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
  }, [user]);

  const toggleBookmark = useCallback(
    async (recipeId: number, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      if (!user) {
        promptLogin("bookmarks");
        return;
      }

      const key = `bookmark:${recipeId}`;
      if (inflightRef.current.has(key)) return;
      inflightRef.current.add(key);

      const supabase = createClient();
      const isBookmarked = bookmarks.has(recipeId);

      // optimistic update
      if (isBookmarked) {
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
      } else {
        setBookmarks((prev) => new Set(prev).add(recipeId));
      }

      try {
        const { error } = isBookmarked
          ? await supabase
              .from("bookmarks")
              .delete()
              .match({ user_id: user.id, recipe_id: recipeId })
          : await supabase
              .from("bookmarks")
              .insert({ user_id: user.id, recipe_id: recipeId });

        if (error) throw error;
      } catch {
        // rollback
        if (isBookmarked) {
          setBookmarks((prev) => new Set(prev).add(recipeId));
        } else {
          setBookmarks((prev) => {
            const next = new Set(prev);
            next.delete(recipeId);
            return next;
          });
        }
        toast.error("Something went wrong. Please try again.");
      } finally {
        inflightRef.current.delete(key);
      }
    },
    [user, bookmarks],
  );

  const toggleLike = useCallback(
    async (recipeId: number, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      if (!user) {
        promptLogin("likes");
        return;
      }

      const key = `like:${recipeId}`;
      if (inflightRef.current.has(key)) return;
      inflightRef.current.add(key);

      const supabase = createClient();
      const isLiked = likes.has(recipeId);
      const prevCount = likeCounts.get(recipeId) ?? 0;

      // optimistic update
      if (isLiked) {
        setLikes((prev) => {
          const next = new Set(prev);
          next.delete(recipeId);
          return next;
        });
        setLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(recipeId, prevCount - 1);
          return next;
        });
      } else {
        setLikes((prev) => new Set(prev).add(recipeId));
        setLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(recipeId, prevCount + 1);
          return next;
        });
      }

      try {
        const { error } = isLiked
          ? await supabase
              .from("likes")
              .delete()
              .match({ user_id: user.id, recipe_id: recipeId })
          : await supabase
              .from("likes")
              .insert({ user_id: user.id, recipe_id: recipeId });

        if (error) throw error;
      } catch {
        // rollback
        if (isLiked) {
          setLikes((prev) => new Set(prev).add(recipeId));
        } else {
          setLikes((prev) => {
            const next = new Set(prev);
            next.delete(recipeId);
            return next;
          });
        }
        setLikeCounts((prev) => {
          const next = new Map(prev);
          next.set(recipeId, prevCount);
          return next;
        });
        toast.error("Something went wrong. Please try again.");
      } finally {
        inflightRef.current.delete(key);
      }
    },
    [user, likes, likeCounts],
  );

  const mergeLikeCounts = useCallback(
    (recipes: { id: number; like_count: number }[]) => {
      setLikeCounts((prev) => {
        let changed = false;
        for (const r of recipes) {
          if (!prev.has(r.id)) {
            changed = true;
            break;
          }
        }
        if (!changed) return prev;
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
      promptLogin,
    }),
    [
      bookmarks,
      likes,
      likeCounts,
      isLoaded,
      toggleBookmark,
      toggleLike,
      mergeLikeCounts,
      promptLogin,
    ],
  );

  return (
    <UserInteractionsContext.Provider value={value}>
      {children}
      <LoginPromptModal
        open={loginPromptFeature !== null}
        onOpenChange={(open) => {
          if (!open) setLoginPromptFeature(null);
        }}
        feature={loginPromptFeature ?? "bookmarks"}
      />
    </UserInteractionsContext.Provider>
  );
}
