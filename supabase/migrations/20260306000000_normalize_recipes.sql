-- ===== ENUM TYPES =====
CREATE TYPE public.weak_strong AS ENUM ('off', 'weak', 'strong');
CREATE TYPE public.grain_size_enum AS ENUM ('off', 'small', 'large');
CREATE TYPE public.dr_setting AS ENUM (
  'auto', 'manual', 'standard', 'wide-1', 'wide-2', 'film-simulation'
);

-- ===== REFERENCE TABLES =====

-- 1. simulations
CREATE TABLE public.simulations (
  id   smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug text NOT NULL UNIQUE
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.simulations (slug) VALUES
  ('provia'),('portrait'),('portrait-saturation'),('astia'),
  ('portrait-sharpness'),('portrait-ex'),('velvia'),
  ('pro-neg-std'),('pro-neg-hi'),('classic-chrome'),('eterna'),
  ('classic-neg'),('eterna-bleach-bypass'),('nostalgic-neg'),('reala'),
  ('monochrome'),('monochrome-ye'),('monochrome-r'),('monochrome-g'),
  ('sepia'),('acros'),('acros-ye'),('acros-r'),('acros-g');

CREATE POLICY "simulations are public"
  ON public.simulations FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. camera_models
CREATE TABLE public.camera_models (
  id                smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name              text NOT NULL UNIQUE,
  sensor_generation text NOT NULL
);

ALTER TABLE public.camera_models ENABLE ROW LEVEL SECURITY;

INSERT INTO public.camera_models (name, sensor_generation) VALUES
  ('X-Pro1','X-Trans I'),('X-E1','X-Trans I'),
  ('X-T1','X-Trans II'),('X-E2','X-Trans II'),('X-E2S','X-Trans II'),
  ('X-Pro2','X-Trans II'),('X100S','X-Trans II'),('X100T','X-Trans II'),
  ('X-T2','X-Trans III'),('X-T20','X-Trans III'),('X-H1','X-Trans III'),
  ('X-E3','X-Trans III'),('X100F','X-Trans III'),
  ('X-T3','X-Trans IV'),('X-T30','X-Trans IV'),('X-T30 II','X-Trans IV'),
  ('X-T4','X-Trans IV'),('X-Pro3','X-Trans IV'),('X-S10','X-Trans IV'),
  ('X-E4','X-Trans IV'),('X100V','X-Trans IV'),
  ('X-T5','X-Trans V'),('X-H2','X-Trans V'),('X-H2S','X-Trans V'),
  ('X-S20','X-Trans V'),('X100VI','X-Trans V'),
  ('X-A1','Bayer'),('X-A2','Bayer'),('X-A3','Bayer'),('X-A5','Bayer'),
  ('X-A7','Bayer'),('X-A10','Bayer'),('X-A20','Bayer'),
  ('X-T100','Bayer'),('X-T200','Bayer');

CREATE POLICY "camera_models are public"
  ON public.camera_models FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. lenses (open-ended, insert-on-share)
CREATE TABLE public.lenses (
  id   smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL UNIQUE
);

ALTER TABLE public.lenses ENABLE ROW LEVEL SECURITY;

-- Seed from existing data
INSERT INTO public.lenses (name)
SELECT DISTINCT lens_model FROM public.recipes
WHERE lens_model IS NOT NULL;

CREATE POLICY "lenses are public"
  ON public.lenses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can add lenses"
  ON public.lenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. wb_types
CREATE TABLE public.wb_types (
  id   smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug text NOT NULL UNIQUE
);

ALTER TABLE public.wb_types ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wb_types (slug) VALUES
  ('auto'),('white-priority'),('ambiance-priority'),('daylight'),
  ('cloudy'),('daylight-fluorescent'),('day-white-fluorescent'),
  ('white-fluorescent'),('warm-white-fluorescent'),
  ('living-room-warm-white-fluorescent'),('incandescent'),
  ('flash'),('underwater'),('custom'),('custom-2'),('custom-3'),
  ('custom-4'),('custom-5'),('K');

CREATE POLICY "wb_types are public"
  ON public.wb_types FOR SELECT
  TO anon, authenticated
  USING (true);

-- ===== COLUMN MIGRATION =====

-- 1. Add FK columns
ALTER TABLE public.recipes
  ADD COLUMN simulation_id smallint REFERENCES public.simulations(id),
  ADD COLUMN camera_model_id smallint REFERENCES public.camera_models(id),
  ADD COLUMN lens_id smallint REFERENCES public.lenses(id),
  ADD COLUMN wb_type_id smallint REFERENCES public.wb_types(id);

-- 2. Backfill FK columns
UPDATE public.recipes r
SET simulation_id = s.id
FROM public.simulations s
WHERE r.simulation = s.slug;

UPDATE public.recipes r
SET camera_model_id = cm.id
FROM public.camera_models cm
WHERE replace(r.camera_model, 'FUJIFILM ', '') = cm.name
   OR r.camera_model = cm.name;

UPDATE public.recipes r
SET lens_id = l.id
FROM public.lenses l
WHERE r.lens_model = l.name;

UPDATE public.recipes r
SET wb_type_id = w.id
FROM public.wb_types w
WHERE r.wb_type = w.slug;

-- 3. Drop old view
DROP VIEW IF EXISTS public.recipes_with_stats;

-- 4. Convert enum columns
ALTER TABLE public.recipes
  ALTER COLUMN grain_roughness TYPE public.weak_strong
    USING grain_roughness::public.weak_strong,
  ALTER COLUMN grain_size TYPE public.grain_size_enum
    USING grain_size::public.grain_size_enum,
  ALTER COLUMN color_chrome TYPE public.weak_strong
    USING color_chrome::public.weak_strong,
  ALTER COLUMN color_chrome_fx_blue TYPE public.weak_strong
    USING color_chrome_fx_blue::public.weak_strong,
  ALTER COLUMN dynamic_range_setting TYPE public.dr_setting
    USING dynamic_range_setting::public.dr_setting;

-- 5. Drop old text columns
ALTER TABLE public.recipes
  DROP COLUMN simulation,
  DROP COLUMN camera_model,
  DROP COLUMN lens_model,
  DROP COLUMN wb_type;

-- 6. FK indexes
CREATE INDEX recipes_simulation_id_idx ON public.recipes (simulation_id);
CREATE INDEX recipes_camera_model_id_idx ON public.recipes (camera_model_id);
CREATE INDEX recipes_lens_id_idx ON public.recipes (lens_id);
CREATE INDEX recipes_wb_type_id_idx ON public.recipes (wb_type_id);

-- 7. Recreate view with joins to restore text values
CREATE VIEW public.recipes_with_stats
WITH (security_invoker = on) AS
SELECT
  r.*,
  s.slug AS simulation,
  cm.name AS camera_model,
  cm.sensor_generation,
  l.name AS lens_model,
  w.slug AS wb_type,
  COALESCE(b.cnt, 0) AS bookmark_count,
  COALESCE(lk.cnt, 0) AS like_count
FROM public.recipes r
LEFT JOIN public.simulations s ON s.id = r.simulation_id
LEFT JOIN public.camera_models cm ON cm.id = r.camera_model_id
LEFT JOIN public.lenses l ON l.id = r.lens_id
LEFT JOIN public.wb_types w ON w.id = r.wb_type_id
LEFT JOIN (SELECT recipe_id, COUNT(*) AS cnt FROM public.bookmarks GROUP BY recipe_id) b ON b.recipe_id = r.id
LEFT JOIN (SELECT recipe_id, COUNT(*) AS cnt FROM public.likes GROUP BY recipe_id) lk ON lk.recipe_id = r.id;
