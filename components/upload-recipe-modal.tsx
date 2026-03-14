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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/image-dropzone";
import { RecipeSettings } from "@/components/recipe-settings";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";
import { isRafFile, extractJpegFromRaf } from "@/lib/raf-parser";
import { shareRecipe } from "@/lib/share-recipe";
import { compressImageToThumbnail } from "@/lib/compress-image";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { FujifilmRecipe } from "@/fujifilm/recipe";
import type { FujifilmSimulation } from "@/fujifilm/simulation";
import type { RecipeSettingsRecipe } from "@/components/recipe-settings";

interface UploadRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadRecipeModal({
  open,
  onOpenChange,
}: UploadRecipeModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const t = useTranslations("upload");
  const [image, setImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<FujifilmRecipe | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [simulation, setSimulation] = useState<FujifilmSimulation | null>(
    null,
  );
  const [imageSource, setImageSource] = useState<File | Blob | null>(null);
  const [cameraModel, setCameraModel] = useState<string | null>(null);
  const [lensModel, setLensModel] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [agreeingToTerms, setAgreeingToTerms] = useState(false);

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

  const checkTermsAgreement = useCallback(async () => {
    if (agreedToTerms !== null) return agreedToTerms;
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return false;
      const data = await res.json();
      const agreed = !!data.agreed_to_terms_at;
      setAgreedToTerms(agreed);
      return agreed;
    } catch {
      return false;
    }
  }, [agreedToTerms]);

  const handleAgreeToTerms = useCallback(async () => {
    setAgreeingToTerms(true);
    try {
      const formData = new FormData();
      formData.set("agreed_to_terms", "true");
      const res = await fetch("/api/profile", { method: "PUT", body: formData });
      if (res.ok) {
        setAgreedToTerms(true);
        setTermsChecked(false);
      } else {
        toast.error(t("failedToSaveAgreement"));
      }
    } catch {
      toast.error(t("failedToSaveAgreement"));
    } finally {
      setAgreeingToTerms(false);
    }
  }, [t]);

  const handleUpload = useCallback(async () => {
    if (!recipe || !imageSource || !user) return;

    const agreed = await checkTermsAgreement();
    if (!agreed) return;

    setUploading(true);
    try {
      const thumbnail = await compressImageToThumbnail(imageSource);
      const result = await shareRecipe(recipe, simulation, thumbnail, cameraModel, lensModel);
      if (result.success) {
        toast.success(t("uploadSuccess"));
        handleOpenChange(false);
        router.push(`/recipes/${result.recipeId}`);
      } else {
        toast.error(result.error ?? t("uploadFailed"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }, [recipe, simulation, imageSource, cameraModel, lensModel, user, handleOpenChange, router, checkTermsAgreement, t]);

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
          toast.error(
            error instanceof Error
              ? error.message
              : t("rafExtractFailed"),
          );
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
            toast.error(t("makerNoteParseFailed"));
          }
        } else {
          toast.error(t("notFujifilm"));
        }
      } catch (error) {
        console.error("Error extracting Fujifilm metadata:", error);
        toast.error(t("extractFailed"));
      }
    },
    [resetState, t],
  );

  const settingsRecipe: RecipeSettingsRecipe | null = recipe
    ? {
        id: 0,
        simulation: simulation ?? null,
        sensor_generation: null,
        dynamic_range_development: recipe.dynamicRange?.development ?? null,
        grain_roughness: recipe.grainEffect?.roughness ?? null,
        grain_size: recipe.grainEffect?.size ?? null,
        color_chrome: recipe.colorChromeEffect ?? null,
        color_chrome_fx_blue: recipe.colorChromeFXBlue ?? null,
        wb_type: recipe.whiteBalance?.type ?? null,
        wb_color_temperature: recipe.whiteBalance?.colorTemperature ?? null,
        wb_red: recipe.whiteBalance?.red ?? null,
        wb_blue: recipe.whiteBalance?.blue ?? null,
        highlight: recipe.highlight ?? null,
        shadow: recipe.shadow ?? null,
        color: recipe.color ?? null,
        sharpness: recipe.sharpness ?? null,
        noise_reduction: recipe.highISONoiseReduction ?? null,
        clarity: recipe.clarity ?? null,
        bw_adjustment: recipe.bwAdjustment ?? null,
        bw_magenta_green: recipe.bwMagentaGreen ?? null,
      }
    : null;

  const body = (
    <div className="flex flex-col gap-6">
      <ImageDropzone onFileDrop={onDrop} hasImage={!!image} />

      {(image || settingsRecipe) && (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          {image && (
            <img
              src={image}
              alt="Selected photo"
              className="h-auto max-h-[50vh] w-full rounded-lg object-contain shadow-sm animate-in fade-in duration-300"
            />
          )}
          {settingsRecipe && (
            <div className="w-full rounded-lg border border-border">
              <RecipeSettings recipe={settingsRecipe} />
              <div className="px-6 pb-6 flex flex-col gap-3">
                {user && agreedToTerms === false && (
                  <div className="rounded-md border border-border bg-muted/50 p-3 flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t("termsAgreement")}{" "}
                      <Link href="/terms" target="_blank" className="underline text-foreground hover:text-foreground/80">
                        {t("termsOfService")}
                      </Link>
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms-agreement"
                        checked={termsChecked}
                        onCheckedChange={(checked) => setTermsChecked(checked === true)}
                      />
                      <label htmlFor="terms-agreement" className="text-sm cursor-pointer select-none">
                        {t("agreeToTerms")}
                      </label>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleAgreeToTerms}
                      disabled={!termsChecked || agreeingToTerms}
                    >
                      {agreeingToTerms ? t("savingAgreement") : t("agreeAndContinue")}
                    </Button>
                  </div>
                )}
                {(!user || agreedToTerms !== false) && (
                  <Button
                    className="w-full"
                    onClick={() => user ? handleUpload() : setLoginPromptOpen(true)}
                    disabled={uploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? t("uploading") : t("upload")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const loginPrompt = (
    <LoginPromptModal
      open={loginPromptOpen}
      onOpenChange={setLoginPromptOpen}
      feature="upload"
    />
  );

  if (isDesktop) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>
                {t("description")}
              </DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
        {loginPrompt}
      </>
    );
  }

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{t("title")}</DrawerTitle>
            <DrawerDescription>
              {t("description")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {body}
          </div>
        </DrawerContent>
      </Drawer>
      {loginPrompt}
    </>
  );
}
