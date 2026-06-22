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
