"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCollections } from "@/contexts/collections-context";
import { Globe, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

interface CollectionCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (collection: { id: number; name: string }) => void;
}

export function CollectionCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: CollectionCreateDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const { createCollection } = useCollections();
  const t = useTranslations("collections");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);

    const collection = await createCollection(
      name.trim(),
      description.trim() || undefined,
      isPublic,
    );

    setCreating(false);

    if (collection) {
      setName("");
      setDescription("");
      setIsPublic(true);
      onOpenChange(false);
      onCreated?.({ id: collection.id, name: collection.name });
    }
  };

  const content = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 pt-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="collection-name">{t("name")}</Label>
        <Input
          id="collection-name"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="collection-description">{t("descriptionLabel")}</Label>
        <Input
          id="collection-description"
          placeholder={t("descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isPublic ? (
            <>
              <Globe className="h-4 w-4" />
              {t("public")}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {t("private")}
            </>
          )}
        </button>
      </div>

      <Button type="submit" disabled={!name.trim() || creating}>
        {creating ? t("creating") : t("createCollection")}
      </Button>
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 pt-8">
          <DialogTitle className="px-6 text-lg font-semibold">
            {t("newCollection")}
          </DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerTitle className="px-6 pt-4 text-lg font-semibold">{t("newCollection")}</DrawerTitle>
        {content}
      </DrawerContent>
    </Drawer>
  );
}
