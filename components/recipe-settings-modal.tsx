"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  RecipeSettings,
  type RecipeSettingsRecipe,
} from "@/components/recipe-settings";

interface RecipeSettingsModalProps {
  recipe: RecipeSettingsRecipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeSettingsModal({
  recipe,
  open,
  onOpenChange,
}: RecipeSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0 pt-8 bg-background/70 dark:bg-background/50 max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-xl max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom">
        <DialogTitle className="sr-only">Recipe Settings</DialogTitle>
        <RecipeSettings recipe={recipe} />
      </DialogContent>
    </Dialog>
  );
}
