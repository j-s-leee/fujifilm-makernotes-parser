"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Link2, Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { useCollections } from "@/contexts/collections-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CollectionHeaderProps {
  collection: {
    id: number;
    user_id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    item_count: number;
    user_display_name: string | null;
    user_username: string | null;
  };
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  const { user } = useUser();
  const router = useRouter();
  const { deleteCollection, refreshCollections } = useCollections();
  const isOwner = user?.id === collection.user_id;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [isPublic, setIsPublic] = useState(collection.is_public);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("collections")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      })
      .eq("id", collection.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to update collection.");
      return;
    }

    setEditing(false);
    refreshCollections();
    router.refresh();
  };

  const handleDelete = async () => {
    const ok = await deleteCollection(collection.id);
    if (ok) {
      router.push(`/u/${collection.user_username ?? collection.user_id}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {editing ? (
        <div className="flex flex-col gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-bold"
            maxLength={100}
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={300}
          />
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className="flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isPublic ? (
              <>
                <Globe className="h-4 w-4" />
                Public
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Private
              </>
            )}
          </button>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(collection.name);
                setDescription(collection.description ?? "");
                setIsPublic(collection.is_public);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{collection.name}</h1>
            {collection.is_public ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{collection.item_count} recipes</span>
            {(collection.user_username || collection.user_display_name) && (
              <>
                <span>·</span>
                <span>by {collection.user_username ? `@${collection.user_username}` : collection.user_display_name}</span>
              </>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            {collection.is_public && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const url = `${window.location.origin}/collections/${collection.id}`;
                  if (navigator.share) {
                    navigator.share({ title: collection.name, url });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied to clipboard.");
                  }
                }}
              >
                <Link2 className="mr-1 h-3.5 w-3.5" />
                Share
              </Button>
            )}
            {isOwner && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
