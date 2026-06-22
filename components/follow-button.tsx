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
