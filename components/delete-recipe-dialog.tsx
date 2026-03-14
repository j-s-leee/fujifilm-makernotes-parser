"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "./ui/button";
import { useTranslations } from "next-intl";

interface DeleteRecipeDialogProps {
  recipeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteRecipeDialog({
  recipeId,
  open,
  onOpenChange,
}: DeleteRecipeDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/delete`, {
        method: "PATCH",
      });
      if (res.ok) {
        router.push("/recipes");
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      <DialogHeader className="gap-2 pb-4">
        <DialogTitle>{t("deleteTitle")}</DialogTitle>
        <DialogDescription>{t("deleteDescription")}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          onClick={() => onOpenChange(false)}
          disabled={loading}
          variant="outline"
        >
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleDelete} disabled={loading} variant="destructive">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {tCommon("delete")}
        </Button>
      </DialogFooter>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">{content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="p-4 pb-8">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
