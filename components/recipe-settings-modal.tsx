"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecipeSettings, type RecipeSettingsRecipe } from "@/components/recipe-settings";

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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0 pt-8">
        <DialogTitle className="sr-only">Recipe Settings</DialogTitle>
        <RecipeSettings recipe={recipe} />
      </DialogContent>
    </Dialog>
  );
}
