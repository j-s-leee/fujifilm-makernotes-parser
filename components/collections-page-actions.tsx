"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionCreateDialog } from "@/components/collection-create-dialog";

export function CollectionsPageActions() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        New
      </Button>
      <CollectionCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
