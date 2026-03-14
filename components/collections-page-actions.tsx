"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionCreateDialog } from "@/components/collection-create-dialog";
import { useTranslations } from "next-intl";

export function CollectionsPageActions() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const t = useTranslations("collections");

  return (
    <>
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t("new")}
      </Button>
      <CollectionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
