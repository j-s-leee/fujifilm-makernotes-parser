# 팔로우 기능 + 제작자 프로필 강화 (SNS 링크)

## 배경

`docs/superpowers/specs/2026-06-22-new-feeature-idea.md`에 정리된 Tally 설문 결과 기반 논의를 검토한 결과:

- 설문에서 직접 검증된 최상위 수요: "다른 사람의 레시피 구경"(56%), "레시피 제작자 팔로우"(39%), "기종/시뮬레이션 필터링"(39%)
- "레시피 댓글로 소통"(6%), "소통 목적 유입"(6%)은 수요가 낮아 제외
- 코드베이스 조사 결과 **기종/시뮬레이션 필터링은 이미 구현되어 있음** (`/recipes` 페이지의 `recipe-filters.tsx` + `/recipes/camera/[slug]`, `/recipes/simulation/[slug]` 등 SEO 랜딩페이지). 추가 작업 불필요.
- **팔로우는 전혀 구현되어 있지 않음** — 이번 업데이트의 핵심 기능.
- Gemini가 제안한 "제작자 유입을 위한 포트폴리오 페이지"는 `/u/[identifier]` 페이지로 이미 상당 부분 존재(레시피 그리드 + 공개 컬렉션 + 통계). SNS 링크 필드만 추가하면 제작자 유입 전략이 거의 완성됨.
- Gemini가 제안한 "비공개 보관함 + 광고 기반 슬롯 확장(BM)"은 설문으로 직접 검증되지 않은 추론이고 AdSense 연동 등 별도 의사결정이 필요해 이번 범위에서 제외(백로그).

## 목표

1. 사용자가 다른 제작자를 팔로우/언팔로우할 수 있다.
2. 프로필 페이지에서 팔로워/팔로잉 수를 보고, 클릭하면 목록(이름+아바타)을 모달로 볼 수 있다.
3. 제작자가 본인 프로필에 Instagram/YouTube/블로그 링크를 등록하고, 방문자가 그걸 보고 외부 채널로 이동할 수 있다.

## 비목표 (이번 범위 제외)

- 레시피 댓글 기능
- 비공개 보관함 + 광고 기반 용량 확장 (별도 기획 필요)
- 팔로잉 전용 피드/타임라인 페이지 (홈은 `revalidate=43200` ISR 정적 캐싱이라 개인화 피드를 넣으려면 아키텍처가 커짐 — 이번엔 프로필 헤더의 버튼+카운트로 한정)
- 팔로우 발생 시 알림 (알림 시스템 자체가 없음 — 새 인프라라 별도 기획 필요)
- 팔로워/팔로잉 목록 페이지네이션 (최근 100명만 노출, 현재 사이트 규모상 충분)
- 기종/시뮬레이션 필터링 신규 작업 (이미 구현되어 있음)

## 데이터 모델

### 1. `follows` 테이블 (신규)

```sql
-- supabase/migrations/20260622000000_follows.sql
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

-- follower_id는 PK 선두 컬럼이라 (follower_id, following_id) 검색에 이미 커버됨.
-- "이 사람을 팔로우하는 사람들" 조회(following_id = X)를 위한 인덱스만 추가.
CREATE INDEX follows_following_id_idx ON public.follows (following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- likes/bookmarks와 동일 패턴: 전체 공개 읽기, 본인만 쓰기/삭제
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
```

자기 자신 팔로우는 `CHECK` 제약으로 DB 레벨에서 막고, UI에서도 본인 프로필에는 팔로우 버튼을 노출하지 않아 이중으로 방지한다. 계정 삭제 시 `ON DELETE CASCADE`로 관련 행이 자동 정리된다.

### 2. `profiles` 테이블에 SNS 링크 컬럼 추가

```sql
-- supabase/migrations/20260622000100_profile_sns_links.sql
-- ============================================================
-- PROFILE SNS LINKS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN instagram_url text,
  ADD COLUMN youtube_url   text,
  ADD COLUMN blog_url      text;
```

세 필드 모두 nullable. 자유 URL 형식 — 도메인이 instagram.com/youtube.com인지 강제하지 않는다(릴스 직접 링크, 다른 단축 URL 등 허용). 서버에서 `http(s)://`로 시작하고 길이 ≤300자인지만 검증.

### 3. `get_user_stats` RPC 확장

```sql
-- supabase/migrations/20260622000200_user_stats_follow_counts.sql
-- ============================================================
-- get_user_stats: add follower_count, following_count
-- RETURNS TABLE 컬럼 목록이 바뀌므로 CREATE OR REPLACE 불가 → DROP 후 재생성
-- (이 프로젝트 마이그레이션 룰의 "함수는 안전" 원칙의 예외: 시그니처 변경 시에만 DROP 필요)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_user_stats(uuid);

CREATE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE(
  recipe_count     bigint,
  total_likes      bigint,
  total_bookmarks  bigint,
  follower_count   bigint,
  following_count  bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.recipes WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COALESCE(SUM(like_count), 0) FROM public.recipes WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COALESCE(SUM(bookmark_count), 0) FROM public.recipes WHERE user_id = p_user_id AND deleted_at IS NULL),
    (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id),
    (SELECT COUNT(*) FROM public.follows WHERE follower_id = p_user_id);
$$;
```

`follower_count`/`following_count`는 정적 집계값이라 `/u/[identifier]`의 ISR 캐시(`revalidate=3600`)에 그대로 포함해도 안전하다(뷰어 무관). 반면 "내가 이 사람을 팔로우 중인가"는 뷰어마다 다른 값이므로 서버에서 절대 내려줄 수 없고, 클라이언트에서 별도 조회한다 (아래 컴포넌트 설계 참고).

## 컴포넌트 / API 설계

### 신규 파일

**`components/follow-button.tsx`** (client component)

```ts
interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (isFollowing: boolean) => void; // 부모가 카운트 +-1 하도록 알림
}
```

- 마운트 시: `user`가 있으면 `supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetUserId).maybeSingle()`로 현재 팔로우 여부 조회. 로딩 중엔 버튼 비활성 스켈레톤.
- 클릭 시: `toggleBookmark`/`toggleLike`와 동일한 optimistic 패턴 — in-flight 가드, 즉시 상태 반전 + `onFollowChange` 호출, `insert`/`delete` 실패 시 롤백 + `toast.error`.
- 비로그인 상태로 클릭 시: 로그인 유도. `usePathname()`(from `@/i18n/navigation`)으로 현재 프로필 경로를 얻어 `LoginPromptModal`에 `feature="follow"` `next={pathname}`으로 전달 — 로그인 후 보던 프로필로 정확히 복귀.
- 스타일: 팔로우 안 한 상태 = 채워진 CTA 버튼(`Button` variant="default"), 팔로우 중 = `variant="outline"` (Instagram/Twitter 컨벤션).

**`components/follow-list-modal.tsx`** (client component)

```ts
interface FollowListModalProps {
  targetUserId: string;
  initialMode: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

- 상단에 "팔로워" / "팔로잉" 전환 pill 버튼 2개 (`recipe-filters.tsx`의 `pillActive`/`pillInactive` 클래스 재사용, 새 UI 프리미티브 추가 없음 — 프로젝트에 `Tabs` 컴포넌트가 없어서 새로 만들지 않음).
- 모달이 열릴 때(또는 모드 전환 시) 2단계 조회 (기존 `/u/[identifier]/page.tsx`의 collection cover 조회와 동일 패턴 — FK 임베드 없이 직접 두 번 조회):
  1. `followers` 모드: `follows`에서 `following_id = targetUserId`인 행의 `follower_id` 목록, `created_at` desc, `limit(100)`
     `following` 모드: `follower_id = targetUserId`인 행의 `following_id` 목록
  2. 위 ID 목록으로 `profiles`에서 `id, display_name, username, avatar_path` 배치 조회, 순서 유지하며 머지
- 각 행: 아바타 + 표시 이름/@username, 클릭 시 모달 닫고 `/u/[identifier]`로 이동
- 빈 상태: "아직 팔로워가 없습니다" / "아직 팔로잉한 사용자가 없습니다"
- `Dialog`(shadcn) 사용, `max-h-[60vh] overflow-y-auto` 스크롤 목록

### 기존 파일 수정

**`components/user-profile-header.tsx`**

- props에 `stats.followerCount`, `stats.followingCount` 추가; `profile.instagramUrl`, `profile.youtubeUrl`, `profile.blogUrl` 추가
- 이름/유저네임 아래에 클릭 가능한 텍스트 `"{followerCount} 팔로워 · {followingCount} 팔로잉"` 추가 → 클릭한 쪽(팔로워/팔로잉)을 `initialMode`로 `FollowListModal` 오픈
- `followerCount`는 로컬 state로 관리(`useState(stats.followerCount)`), `FollowButton`의 `onFollowChange`로 +-1 갱신 (기존 `likeCounts` optimistic 패턴과 동일한 사고방식, 단 이 페이지엔 하나의 프로필만 있어 전역 Context 불필요)
- 헤더 우측에 `!isOwner`일 때만 `<FollowButton targetUserId={profile.id} onFollowChange={...} />`
- 이름 옆에 SNS 아이콘 링크 3개(있는 것만 렌더링): `<Instagram>`, `<Youtube>`, `<Link>` (lucide-react, 모두 이미 패키지에 존재 확인됨) — `<a href={url} target="_blank" rel="noopener noreferrer">`로 새 탭 이동. 별도 파일로 추출하지 않고 이 컴포넌트에 인라인(한 곳에서만 쓰임).

**`components/login-prompt-modal.tsx`**

- `LoginFeature` 유니온에 `"follow"` 추가
- `FEATURE_ICONS.follow = <UserPlus className={iconClass} />` (lucide-react `UserPlus`)
- `FEATURE_NEXT.follow = "/"` (fallback 기본값 — 실제로는 아래 `next` prop이 덮어씀)
- `BENEFIT_KEYS.follow = ["discover", "support", "connect"]`
- `LoginPromptModalProps`에 `next?: string` 옵셔널 추가, `GoogleSignInButton`에 `next={next ?? FEATURE_NEXT[feature]}`로 전달 (기존 호출부는 변경 없음, `FollowButton`만 새로 `next` 사용)

**`app/[locale]/profile/page.tsx`**

- Instagram/YouTube/블로그 URL 입력 필드 3개 추가 (username 입력 아래)
- 각 필드: 빈 값 허용, 입력 시 클라이언트에서 `^https?:\/\//` 가벼운 검증(실패해도 차단하진 않고 저장 시 서버가 최종 검증·에러 토스트)
- `handleSave`의 `FormData`에 `instagram_url`, `youtube_url`, `blog_url` 추가
- `loadProfile`에서 `/api/profile` GET 응답의 새 필드를 state에 반영

**`app/api/profile/route.ts`**

- `GET`: `profiles` select에 `instagram_url, youtube_url, blog_url` 추가, 응답 JSON에 포함
- `PUT`: `formData`에서 세 필드 읽어 서버 검증(`/^https?:\/\/.{1,290}$/` 또는 빈 문자열→`null`) 후 `updateData`에 포함. 형식이 틀리면 400 응답(기존 username 검증 에러 응답 패턴과 동일하게 `{ error: "..." }`)

**`app/[locale]/u/[identifier]/page.tsx`**

- `getProfile`의 select에 `instagram_url, youtube_url, blog_url` 추가
- `getUserStats`의 매핑에 `followerCount: Number(row?.follower_count ?? 0)`, `followingCount: Number(row?.following_count ?? 0)` 추가
- `UserProfileHeader`에 새 props 전달

### i18n 추가 (en.json / ko.json)

`userProfile` 네임스페이스:

| key | ko | en |
|---|---|---|
| `followers` | `{count, plural, one {팔로워} other {팔로워}}` | `{count, plural, one {Follower} other {Followers}}` |
| `following` | `{count, plural, one {팔로잉} other {팔로잉}}` | `{count, plural, one {Following} other {Following}}` |
| `follow` | `팔로우` | `Follow` |
| `unfollow` | `팔로잉` | `Following` |
| `followersTitle` | `팔로워` | `Followers` |
| `followingTitle` | `팔로잉` | `Following` |
| `noFollowers` | `아직 팔로워가 없습니다.` | `No followers yet.` |
| `noFollowing` | `아직 팔로잉한 사용자가 없습니다.` | `Not following anyone yet.` |
| `viewInstagram` | `인스타그램` | `Instagram` |
| `viewYoutube` | `유튜브` | `YouTube` |
| `viewBlog` | `블로그` | `Blog` |

`profile` 네임스페이스:

| key | ko | en |
|---|---|---|
| `instagramUrl` | `인스타그램` | `Instagram` |
| `youtubeUrl` | `유튜브` | `YouTube` |
| `blogUrl` | `블로그` | `Blog` |
| `instagramPlaceholder` | `https://instagram.com/yourhandle` | `https://instagram.com/yourhandle` |
| `youtubePlaceholder` | `https://youtube.com/@yourhandle` | `https://youtube.com/@yourhandle` |
| `blogPlaceholder` | `https://yourblog.com` | `https://yourblog.com` |
| `invalidUrl` | `올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작)` | `Must be a valid URL starting with http:// or https://` |

`loginPrompt` 네임스페이스에 `follow` 블록 추가:

```json
"follow": {
  "title": "제작자 팔로우",
  "description": "좋아하는 제작자를 팔로우하고 새 레시피를 놓치지 마세요.",
  "benefits": {
    "discover": "좋아하는 제작자의 신작 레시피 확인",
    "support": "제작자에게 응원을 보내기",
    "connect": "취향이 맞는 사람들과 연결되기"
  }
}
```
(영문은 기존 다른 블록 톤에 맞춰 동일 구조로 작성)

## UI 동작 요약

1. `/u/[identifier]` 방문 → 헤더에 이름, "@username", **"12 팔로워 · 3 팔로잉"**(클릭 가능), SNS 아이콘(등록된 것만), 우측에 **[팔로우]** 버튼(본인이면 안 보임)
2. **[팔로우]** 클릭 → 비로그인이면 로그인 모달(로그인 후 이 프로필로 복귀) → 로그인 상태면 즉시 optimistic 토글, 버튼이 **[팔로잉]**(outline)으로 바뀌고 카운트 +1
3. "12 팔로워" 클릭 → 모달 오픈, 팔로워 목록(아바타+이름) 표시, 상단 pill로 "팔로잉" 탭 전환 가능
4. `/profile`(본인 설정) → Instagram/YouTube/블로그 URL 입력란 추가, 저장 시 형식 검증 후 `/u/[identifier]` 헤더에 반영(기존 `revalidateOnProfileUpdated`가 그대로 캐시 무효화 처리하므로 추가 변경 불필요)

## 마이그레이션 순서

DB 먼저, 코드 배포는 그 다음(`CLAUDE.md`의 배포 원칙 그대로):

1. `20260622000000_follows.sql`
2. `20260622000100_profile_sns_links.sql`
3. `20260622000200_user_stats_follow_counts.sql`
3개 모두 `supabase db push`로 프로덕션 적용 후 검증 → 코드 PR 머지(Vercel 배포)

## 엣지 케이스

- 자기 자신 팔로우: DB `CHECK` 제약 + UI 미노출로 이중 방지
- 계정 삭제: `follows`가 `ON DELETE CASCADE`로 자동 정리
- 비로그인 사용자도 팔로워/팔로잉 수와 목록은 볼 수 있음(공개 데이터) — 팔로우 버튼 클릭 시에만 로그인 유도
- 팔로우 토글은 `bookmark_count`/`like_count`처럼 매 클릭마다 `revalidatePath` 하지 않음(과도한 ISR 무효화 방지) — 표시 카운트는 클라이언트 optimistic 값으로 즉시 반영되고, 실제 캐시는 다음 ISR 주기(1시간)나 다른 트리거 시 갱신됨. 기존 좋아요/북마크 카운트도 동일하게 동작하므로 일관성 있음.
- SNS URL 검증 실패: 서버 400 응답, 클라이언트 토스트로 에러 표시(기존 username 검증 에러 패턴 재사용)
