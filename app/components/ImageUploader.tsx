"use client";

import { useState, useCallback } from "react";
import {
  FujifilmSimulation,
  getFujifilmSimulationFromMakerNote,
} from "@/fujifilm/simulation";
import {
  FujifilmRecipe,
  getFujifilmRecipeFromMakerNote,
} from "@/fujifilm/recipe";
import * as exifr from "exifr";
import { Camera } from "lucide-react";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { FujifilmRecipeCard } from "@/components/fujifilm-recipe-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ImageUploader() {
  const [image, setImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<FujifilmRecipe | null>(null);
  const [simulation, setSimulation] = useState<FujifilmSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
    setRecipe(null);
    setSimulation(null);
    setIsLoading(true);

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
          setError("Fujifilm MakerNote를 파싱할 수 없습니다.");
        }
      } else {
        setError("MakerNote를 찾을 수 없습니다.");
      }
    } catch (error) {
      setError(
        "Fujifilm 메타데이터를 추출할 수 없습니다. Fujifilm 카메라로 촬영한 이미지인지 확인해주세요."
      );
      console.error("Error extracting Fujifilm metadata:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="w-full space-y-6">
      {image ? (
        <div className="flex flex-col gap-4 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImage(null);
            }}
            className="w-fit"
          >
            <Camera className="h-5 w-5" />
            choose another image
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="justify-self-center shadow-lg rounded-md overflow-hidden">
              <img
                src={image}
                alt="Uploaded"
                className="max-w-full max-h-[calc(100vh-20rem)] object-contain"
              />
            </div>
            <div className="justify-self-center shadow-lg rounded-md">
              {recipe && !isLoading && (
                <div className="w-full h-fit md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
                  <div className="p-4 bg-background/60 backdrop-blur-sm rounded-lg shadow-lg">
                    <FujifilmRecipeCard {...recipe} simulation={simulation} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ImageDropzone onFileDrop={onDrop} />
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
