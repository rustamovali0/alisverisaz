"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { isRealImageFile } from "@/lib/images/client-file-validation";

type SellerImageDropzoneProps = {
  name: "avatarFile" | "bannerFile";
  label: string;
  ratioClassName: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onValidationChange: (busy: boolean) => void;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function SellerImageDropzone({ name, label, ratioClassName, file, onFileChange, onValidationChange }: SellerImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => () => {
    selection.current += 1;
    onValidationChange(false);
  }, [onValidationChange]);

  async function handleFiles(files: FileList | null) {
    const candidate = files?.[0];
    if (!candidate) return;

    const currentSelection = ++selection.current;
    onValidationChange(true);
    setError("");
    try {
      const message = candidate.size > MAX_IMAGE_SIZE
        ? `${label} maksimum 5MB ola bilər.`
        : await isRealImageFile(candidate) ? "" : "Yalnız real şəkil faylları qəbul edilir.";
      if (currentSelection !== selection.current) return;
      if (message) {
        setError(message);
        onFileChange(null);
      } else {
        // The parent retains the validated File across steps and form resets.
        onFileChange(candidate);
      }
    } catch {
      if (currentSelection !== selection.current) return;
      setError("Şəkil oxunmadı. Başqa fayl seçin.");
      onFileChange(null);
    } finally {
      if (currentSelection === selection.current) {
        if (inputRef.current) inputRef.current.value = "";
        onValidationChange(false);
      }
    }
  }

  function clearFile() {
    selection.current += 1;
    onValidationChange(false);
    onFileChange(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid min-w-0 content-start gap-2">
      <label htmlFor={`register-${name}`} className="text-sm font-medium">
        {label} <span className="text-xs font-normal text-muted-foreground">(istəyə bağlı)</span>
      </label>
      <div className="relative min-w-0">
        <button
          type="button"
          aria-label={`${label} seç`}
          aria-describedby={`${name}-help`}
          className={`relative grid min-h-11 w-full min-w-0 place-items-center overflow-hidden rounded-xl border border-dashed bg-background p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ratioClassName} ${isDragging ? "border-primary bg-primary/5" : "border-input"}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); void handleFiles(event.dataTransfer.files); }}
        >
          {preview ? <img src={preview} alt={label} className="h-full w-full rounded-lg object-cover" /> : (
            <span className="grid place-items-center gap-2 text-sm text-muted-foreground">
              <ImagePlus className="size-7" aria-hidden="true" />
              <span className="sm:hidden">Şəkil seç</span>
              <span className="hidden sm:inline">Şəkli seç və ya buraya sürüklə</span>
            </span>
          )}
        </button>
        {file ? <button type="button" onClick={clearFile} aria-label={`${label} sil`} className="absolute right-1 top-1 grid size-11 place-items-center rounded-full border bg-white text-slate-700 shadow-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="size-4" aria-hidden="true" /></button> : null}
      </div>
      <input ref={inputRef} id={`register-${name}`} type="file" name={name} accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp" className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
      <span id={`${name}-help`} className={`text-xs ${error ? "font-medium text-destructive" : "text-muted-foreground"}`} role={error ? "alert" : undefined}>{error || "Maksimum 5 MB. Sonra da əlavə edə bilərsiniz."}</span>
    </div>
  );
}
