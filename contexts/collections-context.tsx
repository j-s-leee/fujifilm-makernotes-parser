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
import { toast } from "sonner";

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface CollectionsContextValue {
  collections: Collection[];
  isLoaded: boolean;
  refreshCollections: () => Promise<void>;
  createCollection: (
    name: string,
    description?: string,
    isPublic?: boolean,
  ) => Promise<Collection | null>;
  deleteCollection: (id: number) => Promise<boolean>;
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

export function useCollections() {
  const ctx = useContext(CollectionsContext);
  if (!ctx) {
    throw new Error(
      "useCollections must be used within CollectionsProvider",
    );
  }
  return ctx;
}

export function CollectionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchCollections = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("collections")
      .select("id, name, description, is_public, item_count, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch collections:", error);
      return;
    }
    setCollections(data ?? []);
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCollections([]);
      setIsLoaded(false);
      return;
    }
    fetchCollections();
  }, [user, fetchCollections]);

  const refreshCollections = useCallback(async () => {
    await fetchCollections();
  }, [fetchCollections]);

  const createCollection = useCallback(
    async (
      name: string,
      description?: string,
      isPublic: boolean = true,
    ): Promise<Collection | null> => {
      if (!user) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("collections")
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          is_public: isPublic,
        })
        .select("id, name, description, is_public, item_count, created_at, updated_at")
        .single();

      if (error) {
        toast.error("Failed to create collection. Please try again.");
        return null;
      }

      setCollections((prev) => [data, ...prev]);
      return data;
    },
    [user],
  );

  const deleteCollection = useCallback(
    async (id: number): Promise<boolean> => {
      if (!user) return false;
      const supabase = createClient();
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete collection. Please try again.");
        return false;
      }

      setCollections((prev) => prev.filter((c) => c.id !== id));
      return true;
    },
    [user],
  );

  const value = useMemo(
    () => ({
      collections,
      isLoaded,
      refreshCollections,
      createCollection,
      deleteCollection,
    }),
    [collections, isLoaded, refreshCollections, createCollection, deleteCollection],
  );

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}
