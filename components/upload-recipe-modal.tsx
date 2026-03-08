"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImageDropzone } from "@/components/image-dropzone";
import { RecipeCard } from "@/components/recipe-card";
import { useToast } from "@/hooks/use-toast";
import { isRafFile, extractJpegFromRaf } from "@/lib/raf-parser";
import type { FujifilmRecipe } from "@/fujifilm/recipe";
import type { FujifilmSimulation } from "@/fujifilm/simulation";

interface UploadRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadRecipeModal({
  open,
  onOpenChange,
}: UploadRecipeModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<FujifilmRecipe | null>(null);
  const [simulation, setSimulation] = useState<FujifilmSimulation | null>(
    null,
  );
  const [imageSource, setImageSource] = useState<File | Blob | null>(null);
  const [cameraModel, setCameraModel] = useState<string | null>(null);
  const [lensModel, setLensModel] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setImage(null);
    setRecipe(null);
    setSimulation(null);
    setImageSource(null);
    setCameraModel(null);
    setLensModel(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState],
  );

  const handleShareSuccess = useCallback(
    (recipeId: number) => {
      handleOpenChange(false);
      router.push(`/recipes/${recipeId}`);
    },
    [handleOpenChange, router],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      resetState();

      let parseTarget: File | Blob = file;
      if (isRafFile(file)) {
        try {
          const jpegBlob = await extractJpegFromRaf(file);
          parseTarget = jpegBlob;
          setImageSource(jpegBlob);
          setImage(URL.createObjectURL(jpegBlob));
        } catch (error) {
          console.error("RAF parsing error:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description:
              error instanceof Error
                ? error.message
                : "Failed to extract JPEG preview from RAF file",
          });
          return;
        }
      } else {
        setImageSource(file);
        setImage(URL.createObjectURL(file));
      }

      try {
        const exifr = await import("exifr");
        const exifrData = await exifr.parse(parseTarget, {
          tiff: true,
          exif: true,
          makerNote: true,
        });

        if (exifrData.Make && exifrData.Model) {
          setCameraModel(`${exifrData.Make} ${exifrData.Model}`.trim());
        }
        setLensModel(exifrData.LensModel ?? null);

        if (exifrData.makerNote) {
          const { getFujifilmRecipeFromMakerNote } = await import(
            "@/fujifilm/recipe"
          );
          const { getFujifilmSimulationFromMakerNote } = await import(
            "@/fujifilm/simulation"
          );

          const makerNoteBytes = new Uint8Array(
            Object.values(exifrData.makerNote),
          );

          try {
            setRecipe(getFujifilmRecipeFromMakerNote(makerNoteBytes));
            const parsedSim =
              getFujifilmSimulationFromMakerNote(makerNoteBytes);
            if (parsedSim) setSimulation(parsedSim);
          } catch (error) {
            console.error("Error parsing Fujifilm MakerNote:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to parse Fujifilm MakerNote data",
            });
          }
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please check if this is a Fujifilm camera image",
          });
        }
      } catch (error) {
        console.error("Error extracting Fujifilm metadata:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to extract metadata. Please check if this is a Fujifilm camera image",
        });
      }
    },
    [toast, resetState],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto h-[100dvh] sm:h-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Upload Recipe</DialogTitle>
          <DialogDescription>
            Drop a Fujifilm JPEG or RAF to extract and share its film recipe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <ImageDropzone onFileDrop={onDrop} hasImage={!!image} />

          {(image || recipe) && (
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              {image && (
                <img
                  src={image}
                  alt="Selected photo"
                  className="h-auto max-h-[50vh] w-full rounded-lg object-contain shadow-sm animate-in fade-in duration-300"
                />
              )}
              {recipe && (
                <div className="w-full">
                  <RecipeCard
                    {...recipe}
                    simulation={simulation}
                    imageSource={imageSource}
                    cameraModel={cameraModel}
                    lensModel={lensModel}
                    onShareSuccess={handleShareSuccess}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
