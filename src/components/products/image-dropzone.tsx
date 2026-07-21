"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Şəkil oxuna bilmədi."));
    };
    image.src = url;
  });
}

async function convertToWebp(file: File) {
  if (file.type === "image/webp") {
    return file;
  }

  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new Error("Yalnız JPG, PNG və WebP şəkillər qəbul edilir.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Şəkil çevrilməsi mümkün olmadı.");
  }

  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }

        reject(new Error("WebP çevrilməsi mümkün olmadı."));
      },
      "image/webp",
      0.86,
    );
  });

  const name = file.name.replace(/\.(jpe?g|png|webp)$/i, ".webp");

  return new File([blob], name, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export function ImageDropzone({
  files,
  onFilesChange,
  disabled = false,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  async function addFiles(nextFiles: FileList | File[]) {
    setIsConverting(true);
    try {
      const converted = await Promise.all(Array.from(nextFiles).map(convertToWebp));
      onFilesChange([...files, ...converted]);
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled={disabled || isConverting}
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
        <span className="text-sm font-medium">
          {isConverting ? "WebP çevrilir" : "Şəkilləri buraya sürüklə"}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">
          JPG və PNG avtomatik WebP formatına çevrilir
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
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
      {files.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
                }}
                aria-label="Şəkli sil"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
