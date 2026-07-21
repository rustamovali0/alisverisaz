"use client";

import { Copy, Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import { ImageDropzone } from "@/components/products/image-dropzone";
import { Button } from "@/components/ui/button";
import { deleteMediaAction, uploadMediaAction } from "@/lib/cms/actions";
import type { MediaAsset } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/swal";

type MediaLibraryProps = {
  assets: MediaAsset[];
};

export function MediaLibrary({ assets }: MediaLibraryProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.delete("files");
    files.forEach((file) => {
      formData.append("files", file);
    });

    startTransition(async () => {
      const result = await uploadMediaAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Media yüklənmədi");
        return;
      }

      setFiles([]);
      await appAlert.success("Media yükləndi", result.message);
    });
  }

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      const result = await deleteMediaAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Media silinmədi");
        return;
      }

      await appAlert.success("Media silindi", result.message);
    });
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleUpload} className="grid gap-4 rounded-md border bg-card p-4">
        <label className="grid gap-2 text-sm font-medium">
          Alt mətn
          <input
            name="altText"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <ImageDropzone files={files} onFilesChange={setFiles} disabled={isPending} />
        <Button type="submit" className="w-fit" disabled={isPending || files.length === 0}>
          Media yüklə
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {assets.map((asset) => (
          <article key={asset.id} className="overflow-hidden rounded-md border bg-card shadow-sm">
            <div className="aspect-video bg-muted">
              <img
                src={asset.url}
                alt={asset.altText || asset.fileName}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="grid gap-3 p-3 text-sm">
              <p className="truncate font-medium">{asset.fileName}</p>
              <p className="text-muted-foreground">
                {asset.mimeType} · {(asset.sizeBytes / 1024).toFixed(1)} KB
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(asset.url)}
                >
                  <Copy className="mr-2 size-4" />
                  URL
                </Button>
                <form action={handleDelete}>
                  <input type="hidden" name="mediaId" value={asset.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    <Trash2 className="mr-2 size-4" />
                    Sil
                  </Button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
