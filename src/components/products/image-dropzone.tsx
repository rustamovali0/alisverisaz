"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { isRealImageFile } from "@/lib/images/client-file-validation";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number | null;
  title?: string;
};

function FilePreview({ file, alt }: { file: File; alt: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url ? (
    <img src={url} alt={alt} className="h-full w-full object-cover" />
  ) : null;
}

export function ImageDropzone({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 5,
  title = "Yeni şəkil əlavə et",
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState("");

  async function addFiles(nextFiles: FileList | File[]) {
    const incomingFiles = Array.from(nextFiles);
    const availableSlots = maxFiles === null ? incomingFiles.length : maxFiles - files.length;

    if (maxFiles !== null && incomingFiles.length > availableSlots) {
      const message = `Maksimum ${maxFiles} şəkil seçə bilərsiniz.`;
      setValidationError(message);
      void appAlert.error(message, "Şəkil limiti");
      return;
    }

    const allowedFiles =
      maxFiles === null
        ? incomingFiles
        : incomingFiles.slice(0, Math.max(availableSlots, 0));
    const imageChecks = await Promise.all(allowedFiles.map(async (file) => ({
      file,
      isImage: await isRealImageFile(file),
    })));
    const imageFiles = imageChecks
      .filter((item) => item.isImage)
      .map((item) => item.file);

    if (imageFiles.length === 0) {
      setValidationError("Yalnız real şəkil faylları qəbul edilir.");
      return;
    }

    setValidationError("");
    onFilesChange([...files, ...imageFiles]);
  }

  function makeMainImage(index: number) {
    if (index <= 0 || index >= files.length) {
      return;
    }

    const selectedFile = files[index];

    if (!selectedFile) {
      return;
    }

    const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
    onFilesChange([selectedFile, ...nextFiles]);
  }

  const hasRemainingSlots = maxFiles === null || files.length < maxFiles;

  return (
    <div className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) {
            void addFiles(event.target.files);
          }
          event.target.value = "";
        }}
      />
      {validationError ? (
        <p className="text-sm font-medium text-destructive">{validationError}</p>
      ) : null}
      {files.length > 0 ? (
        <div className="grid gap-3">
          <div className="max-w-md overflow-hidden rounded-lg border bg-card">
            <div className="relative aspect-[4/3] max-h-56 bg-muted">
              <FilePreview file={files[0]} alt="Əsas şəkil" />
              <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                Əsas şəkil
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 size-8 rounded-lg border border-white/80 bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 sm:size-9"
                onClick={() => onFilesChange(files.slice(1))}
                aria-label="Əsas şəkli sil"
              >
                <X className="size-4 stroke-[2.8]" aria-hidden="true" />
              </Button>
            </div>
            <p className="truncate px-3 py-2 text-sm text-muted-foreground">
              {files[0].name}
            </p>
          </div>
          {files.length > 1 ? (
            <div className="grid max-w-md grid-cols-4 gap-2 sm:grid-cols-6">
              {files.slice(1).map((file, index) => {
                const realIndex = index + 1;

                return (
                  <div
                    key={`${file.name}-${realIndex}`}
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                  >
                    <FilePreview file={file} alt={`${realIndex + 1}. şəkil`} />
                    <button
                      type="button"
                      className="absolute inset-x-1 bottom-1 rounded bg-background/90 px-1.5 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-sm transition hover:bg-primary hover:text-primary-foreground group-hover:opacity-100 group-focus-within:opacity-100"
                      onClick={() => makeMainImage(realIndex)}
                      aria-label="Əsas şəkil et"
                    >
                      Əsas et
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-1 top-1 size-7 rounded-md border border-white/80 bg-destructive text-destructive-foreground opacity-100 shadow-sm hover:bg-destructive/90"
                      onClick={() => {
                        onFilesChange(
                          files.filter((_, fileIndex) => fileIndex !== realIndex),
                        );
                      }}
                      aria-label="Şəkli sil"
                    >
                      <X className="size-3.5 stroke-[2.8]" aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="rounded-md bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
        Əsas şəkli aşağıdakı kiçik şəkillərdən seçə bilərsiniz.
      </p>
      {hasRemainingSlots ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed bg-background p-4 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-input",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          )}
        >
          <ImagePlus className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">{title}</span>
          {maxFiles !== null ? (
            <span className="mt-2 text-xs font-semibold text-muted-foreground">
              {files.length}/{maxFiles} şəkil
            </span>
          ) : null}
        </button>
      ) : (
        <p className="rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
          Şəkil limiti dolub.
        </p>
      )}
    </div>
  );
}
