# 팔로우 기능 + 제작자 프로필(SNS 링크) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제작자 팔로우/언팔로우 기능과 프로필 SNS 링크(Instagram/YouTube/블로그)를 추가해 설문에서 검증된 핵심 수요(팔로우 39%)와 제작자 유입 전략을 충족한다.

**Architecture:** `follows` 신규 조인 테이블(`bookmarks`/`likes`와 동일한 RLS 패턴) + `profiles`에 SNS URL 3컬럼 추가 + `get_user_stats` RPC에 `follower_count`/`following_count` 추가. 팔로우 **수**는 ISR 캐시되는 `/u/[identifier]` 페이지에 서버에서 내려주고(뷰어 무관 정적값), "내가 팔로우 중인가" **상태**만 `bookmarks`/`likes`의 `UserInteractionsContext`와 동일하게 클라이언트 마운트 후 별도 조회한다(뷰어별로 다른 값이라 ISR 캐시에 넣으면 안 됨).

**Tech Stack:** Next.js 15 App Router, Supabase(Postgres + RLS), `@supabase/ssr` 클라이언트, next-intl, shadcn/ui(Dialog, Button), lucide-react.

**참고 스펙 문서:** `docs/superpowers/specs/2026-06-22-follow-and-creator-profile-design.md`

---

## 테스트 방식에 대한 안내 (이 프로젝트는 자동화 테스트가 없음)

이 저장소에는 jest/vitest/playwright 등 테스트 러너가 전혀 설정되어 있지 않고(`package.json` scripts는 `dev`/`build`/`start`/`lint`뿐), 기존 기능(collections, bookmarks, likes 등)도 자동화 테스트 없이 개발되어 있다. 따라서 이 플랜은 표준 TDD 스텝(실패하는 테스트 작성 → 실행 → 구현 → 재실행) 대신 **"구현 → 커밋"** 구조를 사용한다.

**중요:** 이 플랜을 실행하는 에이전트는 `npm run build`, `npm run dev`, 브라우저 접속/스크린샷 등 빌드·로컬 서버 테스트를 **절대 실행하지 않는다.** 프로젝트 소유자가 직접 빌드/개발 서버 확인을 진행한다. 각 태스크는 코드 작성과 커밋까지만 수행하고, 마지막 Task 10에 소유자가 직접 확인할 체크리스트만 남긴다.

---

### Task 1: DB 마이그레이션 (follows 테이블, profiles SNS 컬럼, get_user_stats RPC 확장)

**Files:**
- Create: `supabase/migrations/20260622000000_follows.sql`
- Create: `supabase/migrations/20260622000100_profile_sns_links.sql`
- Create: `supabase/migrations/20260622000200_user_stats_follow_counts.sql`

- [ ] **Step 1: `follows` 테이블 마이그레이션 작성**

`supabase/migrations/20260622000000_follows.sql`:

```sql
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
```

- [ ] **Step 2: profiles SNS 컬럼 마이그레이션 작성**

`supabase/migrations/20260622000100_profile_sns_links.sql`:

```sql
-- ============================================================
-- PROFILE SNS LINKS
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN instagram_url text,
  ADD COLUMN youtube_url   text,
  ADD COLUMN blog_url      text;
```

- [ ] **Step 3: get_user_stats RPC 확장 마이그레이션 작성**

`supabase/migrations/20260622000200_user_stats_follow_counts.sql`:

```sql
-- ============================================================
-- get_user_stats: add follower_count, following_count
-- RETURNS TABLE 컬럼 목록이 바뀌므로 CREATE OR REPLACE 불가 → DROP 후 재생성
-- (이 동작은 Postgres의 제약이며, 데이터 손실이나 다운타임 없음)
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

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260622000000_follows.sql supabase/migrations/20260622000100_profile_sns_links.sql supabase/migrations/20260622000200_user_stats_follow_counts.sql
git commit -m "feat: add follows table, profile SNS columns, extend get_user_stats RPC"
```

**참고:** 이 마이그레이션을 `project-dev`/`project-prod`에 적용(`supabase db push`)하는 작업은 프로젝트 소유자가 직접 진행한다 (CLAUDE.md 배포 원칙: DB 먼저, 코드 배포는 그 다음).

---

### Task 2: i18n 키 추가 (ko.json / en.json)

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/en.json`

- [ ] **Step 1: `messages/ko.json`의 `userProfile` 네임스페이스에 팔로우/SNS 키 추가**

`messages/ko.json`에서 다음 블록을 찾아:

```json
  "userProfile": {
    "joined": "가입일 {date}",
    "editProfile": "프로필 수정",
    "collectionsTitle": "컬렉션",
    "noRecipes": "아직 공유된 레시피가 없습니다.",
    "recipeCount": "{count, plural, one {레시피} other {레시피}}",
    "likeCount": "{count, plural, one {좋아요} other {좋아요}}",
    "bookmarkCount": "{count, plural, one {북마크} other {북마크}}"
  },
```

다음으로 교체:

```json
  "userProfile": {
    "joined": "가입일 {date}",
    "editProfile": "프로필 수정",
    "collectionsTitle": "컬렉션",
    "noRecipes": "아직 공유된 레시피가 없습니다.",
    "recipeCount": "{count, plural, one {레시피} other {레시피}}",
    "likeCount": "{count, plural, one {좋아요} other {좋아요}}",
    "bookmarkCount": "{count, plural, one {북마크} other {북마크}}",
    "followers": "{count, plural, one {팔로워} other {팔로워}}",
    "following": "{count, plural, one {팔로잉} other {팔로잉}}",
    "follow": "팔로우",
    "unfollow": "팔로잉",
    "followersTitle": "팔로워",
    "followingTitle": "팔로잉",
    "noFollowers": "아직 팔로워가 없습니다.",
    "noFollowing": "아직 팔로잉한 사용자가 없습니다.",
    "viewInstagram": "인스타그램",
    "viewYoutube": "유튜브",
    "viewBlog": "블로그"
  },
```

- [ ] **Step 2: `messages/ko.json`의 `profile` 네임스페이스에 SNS 입력 키 추가**

다음 블록을 찾아:

```json
  "profile": {
    "title": "프로필 수정",
    "displayName": "표시 이름",
    "displayNamePlaceholder": "이름",
    "username": "사용자 이름",
    "usernamePlaceholder": "your_username",
    "usernameHint": "소문자, 숫자, 밑줄만 사용 가능합니다. 공개 프로필은 /u/{username}에서 확인할 수 있습니다",
    "profileUpdated": "프로필이 업데이트되었습니다",
    "updateFailed": "프로필 업데이트에 실패했습니다"
  },
```

다음으로 교체:

```json
  "profile": {
    "title": "프로필 수정",
    "displayName": "표시 이름",
    "displayNamePlaceholder": "이름",
    "username": "사용자 이름",
    "usernamePlaceholder": "your_username",
    "usernameHint": "소문자, 숫자, 밑줄만 사용 가능합니다. 공개 프로필은 /u/{username}에서 확인할 수 있습니다",
    "profileUpdated": "프로필이 업데이트되었습니다",
    "updateFailed": "프로필 업데이트에 실패했습니다",
    "instagramUrl": "인스타그램",
    "youtubeUrl": "유튜브",
    "blogUrl": "블로그",
    "instagramPlaceholder": "https://instagram.com/yourhandle",
    "youtubePlaceholder": "https://youtube.com/@yourhandle",
    "blogPlaceholder": "https://yourblog.com",
    "invalidUrl": "올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작)"
  },
```

- [ ] **Step 3: `messages/ko.json`의 `loginPrompt`에 `follow` 블록 추가**

다음 블록을 찾아 (`loginPrompt.collections` 바로 다음, `home` 네임스페이스 직전):

```json
    "collections": {
      "title": "컬렉션",
      "description": "좋아하는 레시피를 컬렉션으로 정리하세요.",
      "benefits": {
        "themed": "테마별 레시피 컬렉션 만들기",
        "shareCommunity": "커뮤니티와 컬렉션 공유",
        "organize": "레시피를 깔끔하게 정리"
      }
    }
  },
  "home": {
```

다음으로 교체:

```json
    "collections": {
      "title": "컬렉션",
      "description": "좋아하는 레시피를 컬렉션으로 정리하세요.",
      "benefits": {
        "themed": "테마별 레시피 컬렉션 만들기",
        "shareCommunity": "커뮤니티와 컬렉션 공유",
        "organize": "레시피를 깔끔하게 정리"
      }
    },
    "follow": {
      "title": "제작자 팔로우",
      "description": "좋아하는 제작자를 팔로우하고 새 레시피를 놓치지 마세요.",
      "benefits": {
        "discover": "좋아하는 제작자의 신작 레시피 확인",
        "support": "제작자에게 응원을 보내기",
        "connect": "취향이 맞는 사람들과 연결되기"
      }
    }
  },
  "home": {
```

- [ ] **Step 4: `messages/en.json`의 `userProfile` 네임스페이스에 동일 키 추가 (영문)**

다음 블록을 찾아:

```json
  "userProfile": {
    "joined": "Joined {date}",
    "editProfile": "Edit Profile",
    "collectionsTitle": "Collections",
    "noRecipes": "No recipes shared yet.",
    "recipeCount": "{count, plural, one {Recipe} other {Recipes}}",
    "likeCount": "{count, plural, one {Like} other {Likes}}",
    "bookmarkCount": "{count, plural, one {Bookmark} other {Bookmarks}}"
  },
```

다음으로 교체:

```json
  "userProfile": {
    "joined": "Joined {date}",
    "editProfile": "Edit Profile",
    "collectionsTitle": "Collections",
    "noRecipes": "No recipes shared yet.",
    "recipeCount": "{count, plural, one {Recipe} other {Recipes}}",
    "likeCount": "{count, plural, one {Like} other {Likes}}",
    "bookmarkCount": "{count, plural, one {Bookmark} other {Bookmarks}}",
    "followers": "{count, plural, one {Follower} other {Followers}}",
    "following": "{count, plural, one {Following} other {Following}}",
    "follow": "Follow",
    "unfollow": "Following",
    "followersTitle": "Followers",
    "followingTitle": "Following",
    "noFollowers": "No followers yet.",
    "noFollowing": "Not following anyone yet.",
    "viewInstagram": "Instagram",
    "viewYoutube": "YouTube",
    "viewBlog": "Blog"
  },
```

- [ ] **Step 5: `messages/en.json`의 `profile` 네임스페이스에 SNS 입력 키 추가**

다음 블록을 찾아:

```json
  "profile": {
    "title": "Edit Profile",
    "displayName": "Display Name",
    "displayNamePlaceholder": "Your name",
    "username": "Username",
    "usernamePlaceholder": "your_username",
    "usernameHint": "Lowercase letters, numbers, and underscores. Your public profile will be at /u/{username}",
    "profileUpdated": "Profile updated",
    "updateFailed": "Failed to update profile"
  },
```

다음으로 교체:

```json
  "profile": {
    "title": "Edit Profile",
    "displayName": "Display Name",
    "displayNamePlaceholder": "Your name",
    "username": "Username",
    "usernamePlaceholder": "your_username",
    "usernameHint": "Lowercase letters, numbers, and underscores. Your public profile will be at /u/{username}",
    "profileUpdated": "Profile updated",
    "updateFailed": "Failed to update profile",
    "instagramUrl": "Instagram",
    "youtubeUrl": "YouTube",
    "blogUrl": "Blog",
    "instagramPlaceholder": "https://instagram.com/yourhandle",
    "youtubePlaceholder": "https://youtube.com/@yourhandle",
    "blogPlaceholder": "https://yourblog.com",
    "invalidUrl": "Must be a valid URL starting with http:// or https://"
  },
```

- [ ] **Step 6: `messages/en.json`의 `loginPrompt`에 `follow` 블록 추가**

다음 블록을 찾아 (`loginPrompt.collections` 바로 다음, `home` 네임스페이스 직전):

```json
    "collections": {
      "title": "Collections",
      "description": "Organize your favorite recipes into curated collections.",
      "benefits": {
        "themed": "Create themed recipe collections",
        "shareCommunity": "Share collections with the community",
        "organize": "Keep your recipes organized"
      }
    }
  },
  "home": {
```

다음으로 교체:

```json
    "collections": {
      "title": "Collections",
      "description": "Organize your favorite recipes into curated collections.",
      "benefits": {
        "themed": "Create themed recipe collections",
        "shareCommunity": "Share collections with the community",
        "organize": "Keep your recipes organized"
      }
    },
    "follow": {
      "title": "Follow Creators",
      "description": "Follow your favorite creators and never miss a new recipe.",
      "benefits": {
        "discover": "See new recipes from creators you love",
        "support": "Show support for the creators you follow",
        "connect": "Connect with people who share your taste"
      }
    }
  },
  "home": {
```

- [ ] **Step 7: JSON 문법 확인**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/ko.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('valid json')"`
Expected: `valid json` 출력 (괄호/콤마 실수로 JSON이 깨지지 않았는지 확인하는 용도이며 빌드나 서버 실행이 아님)

- [ ] **Step 8: 커밋**

```bash
git add messages/ko.json messages/en.json
git commit -m "feat: add i18n keys for follow feature and profile SNS links"
```

---

### Task 3: LoginPromptModal에 `follow` feature 추가

**Files:**
- Modify: `components/login-prompt-modal.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

`components/login-prompt-modal.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Bookmark,
  Check,
  FolderOpen,
  Heart,
  ScanSearch,
  Upload,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";

export type LoginFeature = "recommend" | "bookmarks" | "likes" | "upload" | "collections" | "follow";

const iconClass = "h-8 w-8";

const FEATURE_ICONS: Record<LoginFeature, ReactNode> = {
  recommend: <ScanSearch className={iconClass} />,
  bookmarks: <Bookmark className={iconClass} />,
  likes: <Heart className={iconClass} />,
  upload: <Upload className={iconClass} />,
  collections: <FolderOpen className={iconClass} />,
  follow: <UserPlus className={iconClass} />,
};

const FEATURE_NEXT: Record<LoginFeature, string> = {
  recommend: "/recommend",
  bookmarks: "/bookmarks",
  likes: "/likes",
  upload: "/",
  collections: "/collections",
  follow: "/",
};

const BENEFIT_KEYS: Record<LoginFeature, string[]> = {
  recommend: ["match", "ai", "discover"],
  bookmarks: ["collection", "quickAccess", "organize"],
  likes: ["support", "track", "help"],
  upload: ["share", "feedback", "portfolio"],
  collections: ["themed", "shareCommunity", "organize"],
  follow: ["discover", "support", "connect"],
};

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: LoginFeature;
  /** Overrides FEATURE_NEXT[feature] — e.g. FollowButton passes the current profile path so login returns the user there. */
  next?: string;
}

export function LoginPromptModal({
  open,
  onOpenChange,
  feature,
  next,
}: LoginPromptModalProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const t = useTranslations("loginPrompt");

  const title = t(`${feature}.title`);
  const description = t(`${feature}.description`);
  const benefits = BENEFIT_KEYS[feature].map((key) =>
    t(`${feature}.benefits.${key}`)
  );

  const content = (
    <div className="flex flex-col items-center gap-6 p-6 pt-2">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {FEATURE_ICONS[feature]}
      </div>

      {/* Title & description */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Benefits */}
      <ul className="w-full space-y-2.5">
        {benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <GoogleSignInButton className="w-full" size="lg" next={next ?? FEATURE_NEXT[feature]} />
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 pt-8">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {content}
      </DrawerContent>
    </Drawer>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/login-prompt-modal.tsx
git commit -m "feat: add follow feature to LoginPromptModal with next override"
```

---

### Task 4: FollowButton 컴포넌트 생성

**Files:**
- Create: `components/follow-button.tsx`

- [ ] **Step 1: 파일 생성**

`components/follow-button.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const LoginPromptModal = dynamic(
  () => import("@/components/login-prompt-modal").then((m) => m.LoginPromptModal),
  { ssr: false },
);

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ targetUserId, onFollowChange }: FollowButtonProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const t = useTranslations("userProfile");
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setIsFollowing(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsFollowing(!!data);
      });

    return () => {
      cancelled = true;
    };
  }, [user, targetUserId]);

  async function handleClick() {
    if (!user) {
      setLoginPromptOpen(true);
      return;
    }

    if (inflightRef.current || isFollowing === null) return;
    inflightRef.current = true;

    const supabase = createClient();
    const wasFollowing = isFollowing;

    // optimistic update
    setIsFollowing(!wasFollowing);
    onFollowChange?.(!wasFollowing);

    try {
      const { error } = wasFollowing
        ? await supabase
            .from("follows")
            .delete()
            .match({ follower_id: user.id, following_id: targetUserId })
        : await supabase
            .from("follows")
            .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) throw error;
    } catch {
      // rollback
      setIsFollowing(wasFollowing);
      onFollowChange?.(wasFollowing);
      toast.error("Something went wrong. Please try again.");
    } finally {
      inflightRef.current = false;
    }
  }

  return (
    <>
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        disabled={isFollowing === null}
        onClick={handleClick}
      >
        {isFollowing ? t("unfollow") : t("follow")}
      </Button>
      <LoginPromptModal
        open={loginPromptOpen}
        onOpenChange={setLoginPromptOpen}
        feature="follow"
        next={pathname}
      />
    </>
  );
}
```

**참고:** `toast.error`의 영문 메시지는 새로 만드는 게 아니라 `contexts/user-interactions-context.tsx`의 `toggleBookmark`/`toggleLike`가 이미 쓰고 있는 문자열을 그대로 재사용한 것 — 이 코드베이스의 기존 관례(에러 토스트는 번역 키를 쓰지 않음)를 따른 것이니 임의로 `t()`로 바꾸지 말 것.

- [ ] **Step 2: 커밋**

```bash
git add components/follow-button.tsx
git commit -m "feat: add FollowButton component"
```

---

### Task 5: FollowListModal 컴포넌트 생성

**Files:**
- Create: `components/follow-list-modal.tsx`

- [ ] **Step 1: 파일 생성**

`components/follow-list-modal.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

interface FollowListModalProps {
  targetUserId: string;
  initialMode: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ListedUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_path: string | null;
}

const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

export function FollowListModal({
  targetUserId,
  initialMode,
  open,
  onOpenChange,
}: FollowListModalProps) {
  const t = useTranslations("userProfile");
  const [mode, setMode] = useState<"followers" | "following">(initialMode);
  const [users, setUsers] = useState<ListedUser[] | null>(null);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const fetchList = useCallback(async () => {
    setUsers(null);
    const supabase = createClient();

    const { data: rows } =
      mode === "followers"
        ? await supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", targetUserId)
            .order("created_at", { ascending: false })
            .limit(100)
        : await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", targetUserId)
            .order("created_at", { ascending: false })
            .limit(100);

    const ids: string[] =
      mode === "followers"
        ? (rows ?? []).map((r) => r.follower_id)
        : (rows ?? []).map((r) => r.following_id);

    if (ids.length === 0) {
      setUsers([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_path")
      .in("id", ids);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    setUsers(
      ids.map((id) => profileMap.get(id)).filter((p): p is ListedUser => !!p),
    );
  }, [mode, targetUserId]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  const pillBase =
    "shrink-0 rounded-md border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer";
  const pillActive = "bg-foreground text-background";
  const pillInactive = "border-border text-muted-foreground hover:text-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">
          {mode === "followers" ? t("followersTitle") : t("followingTitle")}
        </DialogTitle>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("followers")}
            className={`${pillBase} ${mode === "followers" ? pillActive : pillInactive}`}
          >
            {t("followersTitle")}
          </button>
          <button
            onClick={() => setMode("following")}
            className={`${pillBase} ${mode === "following" ? pillActive : pillInactive}`}
          >
            {t("followingTitle")}
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {users === null ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {mode === "followers" ? t("noFollowers") : t("noFollowing")}
            </p>
          ) : (
            users.map((u) => {
              const avatarUrl = u.avatar_path
                ? u.avatar_path.startsWith("http")
                  ? u.avatar_path
                  : `${r2Base}/${u.avatar_path}`
                : null;
              const name = u.username ? `@${u.username}` : u.display_name;
              const initials = name ? name.replace("@", "").slice(0, 2).toUpperCase() : "?";

              return (
                <Link
                  key={u.id}
                  href={`/u/${u.username ?? u.id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
                >
                  <Avatar className="h-9 w-9">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? "User"} />}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{name ?? "User"}</span>
                </Link>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add components/follow-list-modal.tsx
git commit -m "feat: add FollowListModal component"
```

---

### Task 6: UserProfileHeader에 팔로우 버튼/카운트/SNS 링크 연결

**Files:**
- Modify: `components/user-profile-header.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

`components/user-profile-header.tsx`:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { useTranslations, useLocale } from "next-intl";
import { Globe, Instagram, Youtube } from "lucide-react";
import { FollowButton } from "@/components/follow-button";

const FollowListModal = dynamic(
  () => import("@/components/follow-list-modal").then((m) => m.FollowListModal),
  { ssr: false },
);

interface UserProfileHeaderProps {
  profile: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
    youtubeUrl: string | null;
    blogUrl: string | null;
  };
  stats: {
    recipeCount: number;
    totalLikes: number;
    totalBookmarks: number;
    followerCount: number;
    followingCount: number;
    joinedAt: string;
  };
}

export function UserProfileHeader({ profile, stats }: UserProfileHeaderProps) {
  const { user } = useUser();
  const isOwner = user?.id === profile.id;
  const t = useTranslations("userProfile");
  const locale = useLocale();
  const [followerCount, setFollowerCount] = useState(stats.followerCount);
  const [listModalMode, setListModalMode] = useState<"followers" | "following" | null>(null);

  const initials = profile.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const joinedDate = new Date(stats.joinedAt).toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
  });

  const snsLinks = (
    [
      profile.instagramUrl && { href: profile.instagramUrl, Icon: Instagram, label: t("viewInstagram") },
      profile.youtubeUrl && { href: profile.youtubeUrl, Icon: Youtube, label: t("viewYoutube") },
      profile.blogUrl && { href: profile.blogUrl, Icon: Globe, label: t("viewBlog") },
    ] as const
  ).filter((link): link is { href: string; Icon: typeof Instagram; label: string } => !!link);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          {profile.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName ?? profile.username ?? "User"} />
          )}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              {profile.displayName ?? profile.username ?? "User"}
            </h1>
            {snsLinks.map(({ href, Icon, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>

          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}

          <div className="flex gap-3 text-sm">
            <button
              onClick={() => setListModalMode("followers")}
              className="font-medium text-foreground hover:underline"
            >
              {followerCount} {t("followers", { count: followerCount })}
            </button>
            <button
              onClick={() => setListModalMode("following")}
              className="font-medium text-foreground hover:underline"
            >
              {stats.followingCount} {t("following", { count: stats.followingCount })}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("joined", { date: joinedDate })}
          </p>
          {isOwner && (
            <Link
              href="/profile"
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              {t("editProfile")}
            </Link>
          )}
        </div>

        {!isOwner && (
          <FollowButton
            targetUserId={profile.id}
            onFollowChange={(isFollowing) =>
              setFollowerCount((c) => (isFollowing ? c + 1 : c - 1))
            }
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold tracking-tight">{stats.recipeCount}</p>
          <p className="text-xs text-muted-foreground">
            {t("recipeCount", { count: stats.recipeCount })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold tracking-tight">{stats.totalLikes}</p>
          <p className="text-xs text-muted-foreground">
            {t("likeCount", { count: stats.totalLikes })}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-bold tracking-tight">{stats.totalBookmarks}</p>
          <p className="text-xs text-muted-foreground">
            {t("bookmarkCount", { count: stats.totalBookmarks })}
          </p>
        </div>
      </div>

      {listModalMode && (
        <FollowListModal
          targetUserId={profile.id}
          initialMode={listModalMode}
          open={listModalMode !== null}
          onOpenChange={(open) => !open && setListModalMode(null)}
        />
      )}
    </div>
  );
}
```

**왜 `isOwner`일 때 FollowButton을 안 보여주나:** 본인 프로필에서 자기 자신을 팔로우하는 건 의미가 없고, `follows` 테이블의 `follows_no_self_follow` CHECK 제약 때문에 시도해도 DB 에러가 난다. UI에서 미리 막아 불필요한 에러 토스트를 방지한다.

- [ ] **Step 2: 커밋**

```bash
git add components/user-profile-header.tsx
git commit -m "feat: wire follow button, follower/following counts, and SNS links into profile header"
```

---

### Task 7: `/api/profile` 라우트에 SNS 필드 추가

**Files:**
- Modify: `app/api/profile/route.ts` (전체 교체)

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

`app/api/profile/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { r2, R2_BUCKET } from "@/lib/r2";
import { revalidateOnProfileUpdated } from "@/lib/actions/revalidate";

const PROFILE_COLUMNS =
  "display_name, username, avatar_path, agreed_to_terms_at, instagram_url, youtube_url, blog_url";

function resolveAvatarUrl(
  avatarPath: string | null | undefined,
  oauthAvatarUrl: string | null,
): string | null {
  if (!avatarPath) return oauthAvatarUrl;
  if (avatarPath.startsWith("http")) return avatarPath;
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  return `${r2PublicUrl}/${avatarPath}`;
}

/** Empty/missing -> clear the field. Non-empty -> must be http(s):// and reasonably short. */
function parseSnsUrl(raw: string | null): { value: string | null } | { error: true } {
  if (!raw) return { value: null };
  if (!/^https?:\/\/.{1,290}$/.test(raw)) return { error: true };
  return { value: raw };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  if (!profile) {
    const defaultName =
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

    const { data: inserted } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: defaultName,
        avatar_path: user.user_metadata?.avatar_url ?? null,
      })
      .select(PROFILE_COLUMNS)
      .single();

    profile = inserted;
  }

  const oauthAvatarUrl = user.user_metadata?.avatar_url ?? null;
  const avatarUrl = resolveAvatarUrl(profile?.avatar_path, oauthAvatarUrl);

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatar_url: avatarUrl,
    agreed_to_terms_at: profile?.agreed_to_terms_at ?? null,
    instagram_url: profile?.instagram_url ?? null,
    youtube_url: profile?.youtube_url ?? null,
    blog_url: profile?.blog_url ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const displayName = formData.get("display_name") as string | null;
  const username = formData.get("username") as string | null;
  const avatarFile = formData.get("avatar") as File | null;
  const agreedToTerms = formData.get("agreed_to_terms") as string | null;

  // Fetch current profile for old avatar cleanup and old username revalidation
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("avatar_path, username")
    .eq("id", user.id)
    .single();

  let avatarPath: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    const oldAvatarPath = currentProfile?.avatar_path;

    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    avatarPath = `avatars/${user.id}/${Date.now()}.${ext}`;

    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: avatarPath,
        Body: buffer,
        ContentType: avatarFile.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    // Delete old avatar from R2 (only if it's an R2 path, not an external URL)
    if (oldAvatarPath && !oldAvatarPath.startsWith("http")) {
      r2.send(
        new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldAvatarPath }),
      ).catch(() => {});
    }
  }

  const updateData: Record<string, unknown> = {
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };

  if (username !== undefined) {
    // Validate: lowercase, alphanumeric + underscore, 3-30 chars, not numeric-only, not UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (
      username &&
      (!/^[a-z0-9_]{3,30}$/.test(username) ||
        /^\d+$/.test(username) ||
        uuidPattern.test(username))
    ) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters, lowercase letters, numbers, and underscores only. Cannot be numbers only." },
        { status: 400 },
      );
    }
    updateData.username = username || null;
  }

  if (avatarPath) {
    updateData.avatar_path = avatarPath;
  }

  if (agreedToTerms === "true") {
    updateData.agreed_to_terms_at = new Date().toISOString();
  }

  const snsFields: [string, string | null][] = [
    ["instagram_url", formData.get("instagram_url") as string | null],
    ["youtube_url", formData.get("youtube_url") as string | null],
    ["blog_url", formData.get("blog_url") as string | null],
  ];

  for (const [column, raw] of snsFields) {
    const parsed = parseSnsUrl(raw);
    if ("error" in parsed) {
      return NextResponse.json(
        { error: "SNS links must be valid URLs starting with http:// or https://" },
        { status: 400 },
      );
    }
    updateData[column] = parsed.value;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }

  const oauthAvatarUrl = user.user_metadata?.avatar_url ?? null;
  const avatarUrl = resolveAvatarUrl(profile?.avatar_path, oauthAvatarUrl);

  // Revalidate cached pages that show this user's profile data
  const oldUsername = currentProfile?.username ?? null;
  revalidateOnProfileUpdated({
    userId: user.id,
    username: profile?.username ?? null,
    oldUsername: oldUsername !== (profile?.username ?? null) ? oldUsername : null,
  });

  return NextResponse.json({
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    avatar_url: avatarUrl,
    agreed_to_terms_at: profile?.agreed_to_terms_at ?? null,
    instagram_url: profile?.instagram_url ?? null,
    youtube_url: profile?.youtube_url ?? null,
    blog_url: profile?.blog_url ?? null,
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/profile/route.ts
git commit -m "feat: add SNS link fields to profile API route"
```

---

### Task 8: `/profile` 편집 페이지에 SNS 입력 필드 추가

**Files:**
- Modify: `app/[locale]/profile/page.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

`app/[locale]/profile/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";
import { compressImageToThumbnail } from "@/lib/compress-image";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
        setAvatarUrl(data.avatar_url);
        setInstagramUrl(data.instagram_url ?? "");
        setYoutubeUrl(data.youtube_url ?? "");
        setBlogUrl(data.blog_url ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadProfile();
  }, [user, userLoading, router, loadProfile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("display_name", displayName);
      formData.set("username", username);
      formData.set("instagram_url", instagramUrl);
      formData.set("youtube_url", youtubeUrl);
      formData.set("blog_url", blogUrl);
      if (avatarFile) {
        const { blob, extension } = await compressImageToThumbnail(avatarFile, 256);
        formData.set("avatar", new File([blob], `avatar.${extension}`, { type: blob.type }));
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        toast.success(t("profileUpdated"));
        // Full reload to refresh header profile state (avatar, username, profile link)
        window.location.href = "/";
      } else {
        const data = await res.json();
        toast.error(data.error ?? t("updateFailed"));
      }
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = avatarPreview ?? avatarUrl;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12">
    <div className="w-full max-w-sm">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("title")}</h1>

      <div className="flex flex-col items-center gap-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative"
        >
          <Avatar className="h-24 w-24">
            {previewSrc && <AvatarImage src={previewSrc} alt="Avatar" />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </button>

        <div className="w-full space-y-2">
          <Label htmlFor="display-name">{t("displayName")}</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("displayNamePlaceholder")}
          />
        </div>

        <div className="w-full space-y-2">
          <Label htmlFor="username">{t("username")}</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            placeholder={t("usernamePlaceholder")}
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            {t("usernameHint", { username: username || "..." })}
          </p>
        </div>

        <div className="w-full space-y-2">
          <Label htmlFor="instagram-url">{t("instagramUrl")}</Label>
          <Input
            id="instagram-url"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder={t("instagramPlaceholder")}
            maxLength={300}
          />
        </div>

        <div className="w-full space-y-2">
          <Label htmlFor="youtube-url">{t("youtubeUrl")}</Label>
          <Input
            id="youtube-url"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder={t("youtubePlaceholder")}
            maxLength={300}
          />
        </div>

        <div className="w-full space-y-2">
          <Label htmlFor="blog-url">{t("blogUrl")}</Label>
          <Input
            id="blog-url"
            type="url"
            value={blogUrl}
            onChange={(e) => setBlogUrl(e.target.value)}
            placeholder={t("blogPlaceholder")}
            maxLength={300}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add "app/[locale]/profile/page.tsx"
git commit -m "feat: add SNS link inputs to profile edit page"
```

---

### Task 9: `/u/[identifier]` 페이지에서 팔로우/SNS 데이터 조회 및 전달

**Files:**
- Modify: `app/[locale]/u/[identifier]/page.tsx` (전체 교체)

- [ ] **Step 1: 파일 전체를 아래 내용으로 교체**

`app/[locale]/u/[identifier]/page.tsx`:

```tsx
import { cache } from "react";
import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UserProfileHeader } from "@/components/user-profile-header";
import { GalleryGrid } from "@/components/gallery-grid";
import { CollectionCard } from "@/components/collection-card";
import { GALLERY_SELECT } from "@/lib/queries";
import { getThumbnailUrl } from "@/lib/get-thumbnail-url";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

export const revalidate = 3600; // 1 hour — profile content changes infrequently

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const getProfile = cache(async (identifier: string) => {
  const supabase = createStaticClient();
  const isUuid = UUID_REGEX.test(identifier);
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, avatar_path, created_at, instagram_url, youtube_url, blog_url",
    )
    .eq(isUuid ? "id" : "username", identifier)
    .single();
  return data;
});

const getUserStats = cache(async (userId: string) => {
  const supabase = createStaticClient();
  const { data } = await supabase.rpc("get_user_stats", {
    p_user_id: userId,
  });
  const row = data?.[0];
  return {
    recipeCount: Number(row?.recipe_count ?? 0),
    totalLikes: Number(row?.total_likes ?? 0),
    totalBookmarks: Number(row?.total_bookmarks ?? 0),
    followerCount: Number(row?.follower_count ?? 0),
    followingCount: Number(row?.following_count ?? 0),
  };
});

interface UserProfilePageProps {
  params: Promise<{ identifier: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { identifier } = await params;
  const profile = await getProfile(identifier);
  if (!profile) return {};

  const displayName = profile.display_name ?? profile.username ?? "User";
  const title = profile.username
    ? `${displayName} (@${profile.username})`
    : displayName;

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const image = profile.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : undefined;

  const stats = await getUserStats(profile.id);
  const description = `${stats.recipeCount} recipes shared on film-simulation.site`;

  const profilePath = profile.username ? `/u/${profile.username}` : `/u/${identifier}`;

  return {
    title,
    description,
    alternates: getAlternates(profilePath),
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { identifier, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "userProfile" });
  const profile = await getProfile(identifier);
  if (!profile) notFound();

  const supabase = createStaticClient();

  // Fetch stats, recipes, and public collections in parallel
  const [userStats, { data: recipes }, { data: collections }] =
    await Promise.all([
      getUserStats(profile.id),
      supabase
        .from("recipes_with_stats")
        .select(GALLERY_SELECT)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(24),
      supabase
        .from("collections")
        .select("id, name, description, is_public, item_count")
        .eq("user_id", profile.id)
        .eq("is_public", true)
        .order("updated_at", { ascending: false })
        .limit(12),
    ]);

  // Resolve avatar URL
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
  const avatarUrl = profile.avatar_path
    ? `${r2PublicUrl}/${profile.avatar_path}`
    : null;

  const typedRecipes = (recipes ?? []) as Parameters<typeof GalleryGrid>[0]["initialRecipes"];

  // Fetch cover images for collections (up to 4 per collection)
  const typedCollections = collections ?? [];
  const collectionCovers: Map<number, string[]> = new Map();

  if (typedCollections.length > 0) {
    const collectionIds = typedCollections.map((c) => c.id);
    const { data: coverItems } = await supabase
      .from("collection_items")
      .select("collection_id, recipe_id")
      .in("collection_id", collectionIds)
      .order("created_at", { ascending: false })
      .limit(collectionIds.length * 4);

    if (coverItems && coverItems.length > 0) {
      // Group by collection, max 4 per collection
      const grouped = new Map<number, number[]>();
      for (const item of coverItems) {
        const list = grouped.get(item.collection_id) ?? [];
        if (list.length < 4) list.push(item.recipe_id);
        grouped.set(item.collection_id, list);
      }

      // Fetch thumbnail_path for those recipe IDs
      const allRecipeIds = [...new Set(coverItems.map((i) => i.recipe_id))];
      const { data: thumbs } = await supabase
        .from("recipes")
        .select("id, thumbnail_path, thumbnail_width")
        .in("id", allRecipeIds);

      const thumbMap = new Map(
        (thumbs ?? []).map((t) => [
          t.id,
          t.thumbnail_width
            ? t.thumbnail_path
            : getThumbnailUrl(t.thumbnail_path),
        ]),
      );

      for (const [cid, rids] of grouped) {
        collectionCovers.set(
          cid,
          rids.map((rid) => thumbMap.get(rid)).filter(Boolean) as string[],
        );
      }
    }
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="flex flex-col gap-8">
        <UserProfileHeader
          profile={{
            id: profile.id,
            displayName: profile.display_name,
            username: profile.username,
            avatarUrl,
            instagramUrl: profile.instagram_url,
            youtubeUrl: profile.youtube_url,
            blogUrl: profile.blog_url,
          }}
          stats={{
            recipeCount: userStats.recipeCount,
            totalLikes: userStats.totalLikes,
            totalBookmarks: userStats.totalBookmarks,
            followerCount: userStats.followerCount,
            followingCount: userStats.followingCount,
            joinedAt: profile.created_at,
          }}
        />

        {/* Collections */}
        {typedCollections.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("collectionsTitle")}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {typedCollections.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={{
                    ...c,
                    user_display_name: profile.display_name,
                    user_username: profile.username,
                  }}
                  coverImages={collectionCovers.get(c.id) ?? []}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recipes */}
        {typedRecipes.length > 0 ? (
          <GalleryGrid
            initialRecipes={typedRecipes}
            userId={profile.id}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-20">
            {t("noRecipes")}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add "app/[locale]/u/[identifier]/page.tsx"
git commit -m "feat: pass follow counts and SNS links to user profile page"
```

---

### Task 10: 최종 점검 (프로젝트 소유자가 직접 진행)

이 태스크는 **에이전트가 실행하지 않는다.** 모든 코드 작업이 끝난 뒤 프로젝트 소유자가 직접 아래를 확인한다.

- [ ] `supabase db push`로 3개 마이그레이션을 dev 프로젝트에 적용 후 `get_user_stats`, `follows` 테이블이 의도대로 생성/동작하는지 Supabase 대시보드에서 확인
- [ ] `npm run dev`로 로컬 서버 실행
- [ ] `npm run lint`, `tsc --noEmit`(또는 `npm run build`)로 타입/린트 에러 없는지 확인
- [ ] 로그인 계정 A로 `/u/[다른 사용자 식별자]` 방문 → [팔로우] 클릭 → 버튼이 [팔로잉]으로 바뀌고 팔로워 수 +1 되는지 확인
- [ ] 같은 프로필에서 다시 [팔로잉] 클릭 → 언팔로우, 수 -1 확인
- [ ] 비로그인 상태로 같은 프로필 방문 → [팔로우] 클릭 → 로그인 모달 표시 → 로그인 후 같은 프로필로 복귀하는지 확인
- [ ] "N 팔로워" 클릭 → 모달에서 목록(아바타+이름) 표시, "팔로잉" pill 클릭 시 목록 전환 확인
- [ ] 본인 프로필(`/u/내식별자`) 방문 → 팔로우 버튼이 안 보이는지 확인
- [ ] `/profile`에서 Instagram/YouTube/블로그 URL 입력 후 저장 → `/u/내식별자`에 아이콘 링크로 표시되는지 확인
- [ ] `/profile`에서 `http`로 시작하지 않는 잘못된 URL 입력 후 저장 → 에러 토스트 표시 확인
- [ ] 로케일 스위처로 영어로 전환 후 위 플로우 전부 영문으로 정상 표시되는지 확인
- [ ] 모바일 너비(좁은 화면)에서 헤더 레이아웃이 깨지지 않는지 확인

---

## Self-Review 결과

**스펙 커버리지:**
- follows 테이블 + RLS → Task 1 ✅
- profiles SNS 컬럼 → Task 1 ✅
- get_user_stats RPC 확장 → Task 1 ✅
- FollowButton (optimistic toggle, 로그인 유도, next 복귀) → Task 4 ✅
- FollowListModal (팔로워/팔로잉 전환, 2단계 조회) → Task 5 ✅
- UserProfileHeader 통합(카운트, 버튼, SNS 아이콘) → Task 6 ✅
- LoginPromptModal `follow` feature + `next` prop → Task 3 ✅
- `/api/profile` SNS 필드 GET/PUT + 검증 → Task 7 ✅
- `/profile` 편집 페이지 SNS 입력 → Task 8 ✅
- `/u/[identifier]` 페이지 데이터 조회/전달 → Task 9 ✅
- i18n (ko/en) → Task 2 ✅
- 자기 자신 팔로우 방지(DB+UI) → Task 1(CHECK) + Task 6(`!isOwner`) ✅
- 비로그인 사용자도 카운트/목록 조회 가능(공개 RLS) → Task 1(SELECT policy) ✅

**타입 일관성 확인:** `FollowButtonProps.onFollowChange`, `UserProfileHeader`의 `setFollowerCount` 콜백, `FollowListModalProps.initialMode`/`onOpenChange` 시그니처가 Task 4/5/6 전체에서 동일하게 사용됨. `LoginFeature`에 `"follow"` 추가가 Task 3과 Task 4(`feature="follow"`)에서 일치함. `PROFILE_COLUMNS` 상수가 Task 7의 GET/PUT 양쪽에서 동일하게 재사용됨.

**플레이스홀더 스캔:** TBD/TODO 없음, 모든 코드 블록이 완전한 실행 가능 코드임.

---

## 실행 순서 요약 (다음 세션용)

Task 1 (DB) → Task 2 (i18n) → Task 3 (LoginPromptModal) → Task 4 (FollowButton) → Task 5 (FollowListModal) → Task 6 (UserProfileHeader) → Task 7 (API route) → Task 8 (profile page) → Task 9 (u/[identifier] page) → Task 10 (소유자 수동 검증)

Task 3~5는 서로 독립적이라 순서를 바꿔도 무방하지만, Task 6(UserProfileHeader)은 Task 3~5가 모두 끝난 뒤에 진행해야 한다(FollowButton/FollowListModal/LoginPromptModal을 가져다 쓰기 때문).
