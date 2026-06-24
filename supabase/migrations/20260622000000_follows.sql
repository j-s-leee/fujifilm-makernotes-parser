-- ============================================================
-- FOLLOWS TABLE
-- ============================================================
CREATE TABLE public.follows (
  follower_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id)
);

-- follower_id는 PK 선두 컬럼이라 (follower_id, following_id) 조회는 이미 커버됨.
-- "이 사람의 팔로워 목록"(following_id = X) 조회를 위한 인덱스.
CREATE INDEX follows_following_id_idx ON public.follows (following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are publicly readable"
  ON public.follows FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = follower_id);
