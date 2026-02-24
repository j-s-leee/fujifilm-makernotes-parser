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
import { RecipeCard } from "@/components/recipe-card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
//
// Main Component
//
export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<FujifilmRecipe | null>(null);
  const [simulation, setSimulation] = useState<FujifilmSimulation | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setRecipe(null);
      setSimulation(null);
      setOriginalFile(null);

      // 이미지 미리보기 생성
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
      setOriginalFile(file);

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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="flex w-full max-w-5xl flex-col gap-8">
          <ImageDropzone onFileDrop={onDrop} hasImage={!!image} />
          {(image || recipe) && (
            <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
              {image && (
                <img
                  src={image}
                  alt="Uploaded photo"
                  className="h-auto max-h-[80vh] w-full rounded-lg object-contain shadow-sm animate-in fade-in duration-300"
                />
              )}
              {recipe && (
                <div className="w-full">
                  <RecipeCard {...recipe} simulation={simulation} originalFile={originalFile} />
                </div>
              )}
            </div>
          )}
          {!image && !recipe && (
            <p className="text-center text-sm text-muted-foreground">
              Drop a Fujifilm JPEG to extract its film recipe.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
