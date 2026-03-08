"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";

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
    joinedAt: string;
  };
}

export function UserProfileHeader({ profile, stats }: UserProfileHeaderProps) {
  const { user } = useUser();
  const isOwner = user?.id === profile.id;

  const initials = profile.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const joinedDate = new Date(stats.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
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
        <p className="text-sm text-muted-foreground">
          {stats.recipeCount} {stats.recipeCount === 1 ? "recipe" : "recipes"}
          {" \u00B7 "}
          {stats.totalLikes} {stats.totalLikes === 1 ? "like" : "likes"}
          {" \u00B7 "}
          Joined {joinedDate}
        </p>
        {isOwner && (
          <Link
            href="/profile"
            className="mt-1 text-sm font-medium text-primary hover:underline"
          >
            Edit Profile
          </Link>
        )}
      </div>
    </div>
  );
}
