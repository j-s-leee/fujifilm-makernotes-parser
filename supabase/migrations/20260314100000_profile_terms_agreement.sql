-- ============================================================
-- PROFILE TERMS AGREEMENT: Track when users agree to terms
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN agreed_to_terms_at timestamptz DEFAULT NULL;
