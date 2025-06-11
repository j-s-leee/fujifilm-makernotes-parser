"use client";

import { ImageDropzone } from "@/components/image-dropzone";
import {
  FujifilmSimulation,
  getFujifilmSimulationFromMakerNote,
} from "@/fujifilm/simulation";
import {
  FujifilmRecipe,
  getFujifilmRecipeFromMakerNote,
} from "@/fujifilm/recipe";
import { useState, useCallback } from "react";
import * as exifr from "exifr";
import { FujifilmRecipeCard } from "@/components/fujifilm-recipe-card";
import { ModeToggle } from "@/components/mode-toggle";
import { Film } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
//
// Main Component
//
export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<FujifilmRecipe | null>(null);
  const [simulation, setSimulation] = useState<FujifilmSimulation | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setRecipe(null);
      setSimulation(null);

      // 이미지 미리보기 생성
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);

      try {
        // 이미지 메타데이터 추출
        const exifrData = await exifr.parse(file, {
          tiff: true,
          exif: true,
          makerNote: true,
        });

        if (exifrData.makerNote) {
          const makerNoteBytes = new Uint8Array(
            Object.values(exifrData.makerNote)
          );

          try {
            const parsedRecipe = getFujifilmRecipeFromMakerNote(makerNoteBytes);
            setRecipe(parsedRecipe);

            const parsedSimulation =
              getFujifilmSimulationFromMakerNote(makerNoteBytes);
            if (parsedSimulation) {
              setSimulation(parsedSimulation);
            }
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
            description: "No MakerNote data found in the image",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to extract metadata. Please check if this is a Fujifilm camera image",
        });
        console.error("Error extracting Fujifilm metadata:", error);
      }
    },
    [toast]
  );

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-background group/design-root overflow-x-hidden font-space-grotesk">
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-muted px-10 py-3">
          <div className="flex items-center gap-4">
            <h2 className="text-foreground text-lg font-bold leading-tight tracking-[-0.015em] flex gap-2 items-center">
              <Film className="h-5 w-5" /> Film Recipe Viewer
            </h2>
          </div>
          <div className="flex flex-1 justify-end gap-2md:gap-8">
            <div className="flex items-center gap-9">
              {/* <a
                className="text-foreground/80 hover:text-foreground text-sm font-medium leading-normal transition-colors"
                href="#"
              >
                Home
              </a> */}
              <a
                className="text-foreground/80 hover:text-foreground text-sm font-medium leading-normal transition-colors"
                href="https://tally.so/r/wLqO0J"
                target="_blank"
              >
                Feedback
              </a>
            </div>
            <ModeToggle />
          </div>
        </header>
        {/* new layout */}
        <main className="px-4 sm:px-6 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-8 md:py-12">
          <div className="layout-content-container flex flex-col w-full max-w-5xl gap-8">
            {/* dropzone */}
            <div className="w-full">
              <ImageDropzone onFileDrop={onDrop} />
            </div>
            {/* dropzone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* photo preview */}
              {image && (
                <img
                  src={image}
                  alt="Uploaded"
                  className="max-w-full h-auto max-h-[80vh] rounded-lg object-contain shadow-md"
                />
              )}
              {/* photo preview */}
              {/* recipe details */}
              {recipe && (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md @container">
                  <FujifilmRecipeCard {...recipe} simulation={simulation} />
                </div>
              )}
              {/* recipe details */}
            </div>
          </div>
        </main>
        {/* new layout */}
        <footer className="border-t border-neutral-200 dark:border-neutral-700 py-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            © 2025 Film Recipe Viewer. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
