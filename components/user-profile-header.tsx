"use client";

import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import { useTranslations, useLocale } from "next-intl";

interface UserProfileHeaderProps {
  profile: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  stats: {
    recipeCount: number;
    totalLikes: number;
    totalBookmarks: number;
    joinedAt: string;
  };
}

export function UserProfileHeader({ profile, stats }: UserProfileHeaderProps) {
  const { user } = useUser();
  const isOwner = user?.id === profile.id;
  const t = useTranslations("userProfile");
  const locale = useLocale();

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 shrink-0">
          {profile.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName ?? profile.username ?? "User"} />
          )}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight">
            {profile.displayName ?? profile.username ?? "User"}
          </h1>
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
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
    </div>
  );
}
