"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { isRealImageFile } from "@/lib/images/client-file-validation";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number | null;
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
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState("");

  async function addFiles(nextFiles: FileList | File[]) {
    const incomingFiles = Array.from(nextFiles);
    const allowedFiles =
      maxFiles === null
        ? incomingFiles
        : incomingFiles.slice(0, Math.max(maxFiles - files.length, 0));
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

  return (
    <div className="grid gap-3">
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
          "flex min-h-36 flex-col items-center justify-center rounded-md border border-dashed bg-background p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-input",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
      >
        <ImagePlus className="mb-3 size-7 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium sm:hidden">Şəkil seç</span>
        <span className="hidden text-sm font-medium sm:inline">Şəkilləri seç və ya buraya sürüklə</span>
        {maxFiles !== null ? (
          <span className="mt-2 text-xs font-semibold text-muted-foreground">
            {files.length}/{maxFiles} şəkil
          </span>
        ) : null}
      </button>
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
                className="absolute right-3 top-3 size-12 rounded-xl shadow-md"
                onClick={() => onFilesChange(files.slice(1))}
                aria-label="Əsas şəkli sil"
              >
                <X className="size-7 stroke-[2.8]" aria-hidden="true" />
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-1.5 top-1.5 size-10 rounded-lg opacity-95 shadow-sm"
                      onClick={() => {
                        onFilesChange(
                          files.filter((_, fileIndex) => fileIndex !== realIndex),
                        );
                      }}
                      aria-label="Şəkli sil"
                    >
                      <X className="size-6 stroke-[2.8]" aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
