"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
import { Camera, Upload } from "lucide-react";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { FujifilmRecipeCard } from "@/components/fujifilm-recipe-card";

export default function ImageUploader() {
  const [image, setImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<FujifilmRecipe | null>(null);
  const [simulation, setSimulation] = useState<FujifilmSimulation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);
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
          setError("Could not parse Fujifilm MakerNote.");
        }
      } else {
        setError("Could not find MakerNote.");
      }
    } catch (error) {
      setError(
        "Could not extract Fujifilm metadata. Make sure this is a Fujifilm camera image."
      );
      console.error("Error extracting Fujifilm metadata:", error);
    }
  }, []);

  return (
    <div className="w-full space-y-8">
      {image ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Image Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md">
              <Image
                src={image}
                alt="Uploaded"
                className="object-cover"
                width={300}
                height={300}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recipe && (
                <>
                  <div className="mt-4">
                    <FujifilmRecipeCard {...recipe} simulation={simulation} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Fujifilm 레시피
                    </h3>
                    <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                      {JSON.stringify(recipe, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center pt-4">
              <Button variant="secondary" onClick={() => setImage(null)}>
                choose another image
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Image
            </CardTitle>
            <CardDescription>
              Drag and drop or select a Fujifilm camera image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageDropzone onFileDrop={onDrop} />
          </CardContent>
        </Card>
      )}
      {error && (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
