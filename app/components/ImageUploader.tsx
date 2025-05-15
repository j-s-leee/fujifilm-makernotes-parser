"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FujifilmSimulation,
  getFujifilmSimulationFromMakerNote,
} from "@/fujifilm/simulation";
import {
  FujifilmRecipe,
  getFujifilmRecipeFromMakerNote,
} from "@/fujifilm/recipe";
import * as exifr from "exifr";
import { Camera, Upload, Loader2 } from "lucide-react";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { FujifilmRecipeCard } from "@/components/fujifilm-recipe-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

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
        <Card className="border-2 border-muted">
          <CardHeader className="flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              image preview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImage(null);
                }}
              >
                choose another image
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="relative w-full max-h-[calc(100vh-12rem)] rounded-lg overflow-hidden">
              <img
                src={image}
                alt="Uploaded"
                className="w-full h-full object-contain"
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {recipe && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full max-w-lg mx-auto px-4">
                    <div className="p-4 bg-background/60 backdrop-blur-sm rounded-lg shadow-lg">
                      <FujifilmRecipeCard {...recipe} simulation={simulation} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-muted hover:border-muted-foreground/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              image upload
            </CardTitle>
            <CardDescription>upload a Fujifilm image file</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageDropzone onFileDrop={onDrop} />
          </CardContent>
        </Card>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
