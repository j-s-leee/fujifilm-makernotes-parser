-- ============================================================
-- PROFILE SNS LINKS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN instagram_url text,
  ADD COLUMN youtube_url   text,
  ADD COLUMN blog_url      text;
