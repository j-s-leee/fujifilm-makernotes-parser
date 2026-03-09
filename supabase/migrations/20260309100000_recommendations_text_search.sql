-- Allow text-based recommendations (no image upload needed)
ALTER TABLE public.recommendations
  ALTER COLUMN image_path DROP NOT NULL;

ALTER TABLE public.recommendations
  ADD COLUMN query_text text;
