"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isDesktop = useMediaQuery("(min-width: 640px)");
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
        ? (rows ?? []).map((r) => (r as { follower_id: string }).follower_id)
        : (rows ?? []).map((r) => (r as { following_id: string }).following_id);

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

  const title = mode === "followers" ? t("followersTitle") : t("followingTitle");

  const body = (
    <>
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
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <div className="flex flex-col gap-4 px-4 pb-4">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}
