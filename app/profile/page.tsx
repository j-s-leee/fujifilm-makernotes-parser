"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { compressImageToThumbnail } from "@/lib/compress-image";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
      if (avatarFile) {
        const { blob, extension } = await compressImageToThumbnail(avatarFile, 256);
        formData.set("avatar", new File([blob], `avatar.${extension}`, { type: blob.type }));
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Profile updated" });
        router.push("/");
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error ?? "Failed to update profile",
          variant: "destructive",
        });
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
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Edit Profile</h1>

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
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="w-full space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            placeholder="your_username"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and underscores. Your public profile will be at /u/{username || "..."}
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
    </div>
  );
}
