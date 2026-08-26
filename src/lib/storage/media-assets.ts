import "server-only";

import { serverEnv } from "@/lib/config/env.server";
import { deleteR2ImagesByUrls, isR2PublicUrl, type UploadedR2Image } from "@/lib/storage/r2";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RecordImageMediaAssetInput = {
  uploaded: UploadedR2Image;
  originalFileName: string;
  altText: string;
  userId: string;
  metadata?: Record<string, unknown>;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

function isMissingTableError(error: SupabaseErrorLike | null | undefined) {
  return Boolean(error && ["42P01", "PGRST205"].includes(error.code ?? ""));
}

function isMissingColumnError(error: SupabaseErrorLike | null | undefined) {
  return Boolean(
    error &&
      (error.code === "PGRST204" ||
        error.code === "42703" ||
        error.message?.includes("schema cache")),
  );
}

export async function recordImageMediaAsset({
  uploaded,
  originalFileName,
  altText,
  userId,
  metadata,
}: RecordImageMediaAssetInput) {
  const supabaseAdmin = createSupabaseAdminClient();
  const payload = {
    bucket: serverEnv.r2BucketName,
    path: uploaded.key,
    url: uploaded.url,
    file_name: originalFileName,
    mime_type: uploaded.mimeType,
    size_bytes: uploaded.sizeBytes,
    width: uploaded.width,
    height: uploaded.height,
    alt_text: altText,
    metadata: metadata ?? {},
    created_by: userId,
    updated_by: userId,
  };
  const { error } = await (supabaseAdmin as any).from("media_assets").insert(payload);

  if (!error || isMissingTableError(error)) {
    return;
  }

  if (isMissingColumnError(error)) {
    const { width: _width, height: _height, ...legacyPayload } = payload;
    const { error: legacyError } = await (supabaseAdmin as any)
      .from("media_assets")
      .insert(legacyPayload);

    if (!legacyError || isMissingTableError(legacyError) || isMissingColumnError(legacyError)) {
      return;
    }

    throw new Error(legacyError.message);
  }

  throw new Error(error.message);
}

export async function deleteR2MediaAssetsByUrls(urls: Array<string | null | undefined>) {
  const r2Urls = Array.from(
    new Set(urls.filter((url): url is string => Boolean(url && isR2PublicUrl(url)))),
  );

  if (r2Urls.length === 0) {
    return;
  }

  await deleteR2ImagesByUrls(r2Urls);

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await (supabaseAdmin as any)
    .from("media_assets")
    .delete()
    .in("url", r2Urls);

  if (error && !isMissingTableError(error)) {
    throw new Error(error.message);
  }
}
