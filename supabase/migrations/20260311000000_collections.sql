-- ============================================================
-- COLLECTIONS TABLE
-- ============================================================
CREATE TABLE public.collections (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  is_public   boolean NOT NULL DEFAULT true,
  item_count  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX collections_user_id_idx ON public.collections (user_id);
CREATE INDEX collections_public_created_idx ON public.collections (created_at DESC) WHERE is_public = true;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Anyone can see public collections
CREATE POLICY "Public collections are readable"
  ON public.collections FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Owners can see all their own collections (including private)
CREATE POLICY "Users can read own collections"
  ON public.collections FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Owners can create collections
CREATE POLICY "Users can create collections"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Owners can update their own collections
CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Owners can delete their own collections
CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- COLLECTION_ITEMS TABLE
-- ============================================================
CREATE TABLE public.collection_items (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  collection_id bigint NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  recipe_id     bigint NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (collection_id, recipe_id)
);

CREATE INDEX collection_items_collection_id_idx ON public.collection_items (collection_id);
CREATE INDEX collection_items_recipe_id_idx ON public.collection_items (recipe_id);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Readable if collection is public or owned by current user
CREATE POLICY "Collection items are readable for accessible collections"
  ON public.collection_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND (c.is_public = true OR c.user_id = (SELECT auth.uid()))
    )
  );

-- Only collection owner can add items
CREATE POLICY "Collection owners can add items"
  ON public.collection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

-- Only collection owner can remove items
CREATE POLICY "Collection owners can remove items"
  ON public.collection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_id
      AND c.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- TRIGGER: Maintain collection item_count + updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_collection_item_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections
    SET item_count = item_count + 1, updated_at = now()
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections
    SET item_count = item_count - 1, updated_at = now()
    WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_item_count
  AFTER INSERT OR DELETE ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.update_collection_item_count();
