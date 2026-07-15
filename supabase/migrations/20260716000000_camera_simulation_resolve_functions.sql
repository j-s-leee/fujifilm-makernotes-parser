-- ============================================================
-- Insert-on-share for camera_models and simulations
--
-- Recipe upload previously only SELECTed against these reference
-- tables; a camera model or simulation slug missing from the table
-- silently resolved to a NULL FK (recipe saved without that
-- attribution). Mirror the existing resolve_lens_id() pattern so
-- new values get inserted instead.
-- ============================================================

-- The upload flow only knows the camera name from EXIF, not its
-- sensor generation, so a newly-seen camera can't supply one.
-- Relax NOT NULL so it can still be inserted; sensor_generation is
-- backfilled manually (as it already is for existing rows) once known.
ALTER TABLE public.camera_models ALTER COLUMN sensor_generation DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_camera_model_id(camera_name text)
RETURNS smallint
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result_id smallint;
BEGIN
  SELECT id INTO result_id FROM camera_models WHERE name = camera_name;
  IF NOT FOUND THEN
    INSERT INTO camera_models (name) VALUES (camera_name)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
      SELECT id INTO result_id FROM camera_models WHERE name = camera_name;
    END IF;
  END IF;
  RETURN result_id;
END;
$$;

CREATE POLICY "Users can add camera models"
  ON public.camera_models FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.resolve_simulation_id(simulation_slug text)
RETURNS smallint
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result_id smallint;
BEGIN
  SELECT id INTO result_id FROM simulations WHERE slug = simulation_slug;
  IF NOT FOUND THEN
    INSERT INTO simulations (slug) VALUES (simulation_slug)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO result_id;
    IF result_id IS NULL THEN
      SELECT id INTO result_id FROM simulations WHERE slug = simulation_slug;
    END IF;
  END IF;
  RETURN result_id;
END;
$$;

CREATE POLICY "Users can add simulations"
  ON public.simulations FOR INSERT
  TO authenticated
  WITH CHECK (true);
