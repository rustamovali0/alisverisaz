import "server-only";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { serverEnv } from "@/lib/config/env.server";

const WEBP_CONTENT_TYPE = "image/webp";
const DEFAULT_WEBP_QUALITY = 82;
const MAX_IMAGE_DIMENSION = 2400;
const MAX_INPUT_PIXELS = 36_000_000;
const DEFAULT_ALLOWED_IMAGE_TYPES = ["image/*"];
const RASTER_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "heic",
  "heif",
  "tif",
  "tiff",
  "bmp",
]);
const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
};
const ORIGINAL_UPLOAD_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const IMAGE_PROCESSING_ERROR =
  "Şəkil emalı alınmadı. Faylın real şəkil formatında olduğundan əmin olun.";

let r2Client: S3Client | null = null;

type UploadImageInput = {
  file: File;
  folder: string;
  maxSizeBytes: number;
  allowedMimeTypes?: string[];
};

export type UploadedR2Image = {
  key: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

type ProcessedImage = {
  data: Buffer;
  fileName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

function getR2Client() {
  if (!serverEnv.hasR2Config) {
    throw new Error("Cloudflare R2 ayarları tamamlanmayıb.");
  }

  r2Client ??= new S3Client({
    region: "auto",
    endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: serverEnv.r2AccessKeyId,
      secretAccessKey: serverEnv.r2SecretAccessKey,
    },
  });

  return r2Client;
}

function sanitizePathPart(value: string, fallback: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function sanitizeFolder(folder: string) {
  return folder
    .split("/")
    .map((part) => sanitizePathPart(part, "images"))
    .join("/");
}

function fileNameWithExtension(name: string, extension: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  return `${sanitizePathPart(baseName, "image")}.${extension}`;
}

function webpFileName(name: string) {
  return fileNameWithExtension(name, "webp");
}

function publicUrlForKey(key: string) {
  const baseUrl = serverEnv.r2PublicUrl.replace(/\/+$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return `${baseUrl}/${encodedKey}`;
}

async function convertImageToWebp(input: Buffer, fileName: string): Promise<ProcessedImage> {
  try {
    const sharp = (await import("sharp")).default;
    const converted = await sharp(input, {
      failOn: "none",
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColorspace("srgb")
      .webp({ quality: DEFAULT_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      data: converted.data,
      fileName: webpFileName(fileName),
      mimeType: WEBP_CONTENT_TYPE,
      width: converted.info.width ?? null,
      height: converted.info.height ?? null,
    };
  } catch (error) {
    if (isPixelLimitError(error)) {
      throw error;
    }

    try {
      const sharp = (await import("sharp")).default;
      const normalized = await sharp(input, {
        failOn: "none",
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      const converted = await sharp(normalized)
        .resize({
          width: MAX_IMAGE_DIMENSION,
          height: MAX_IMAGE_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: DEFAULT_WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });

      return {
        data: converted.data,
        fileName: webpFileName(fileName),
        mimeType: WEBP_CONTENT_TYPE,
        width: converted.info.width ?? null,
        height: converted.info.height ?? null,
      };
    } catch (fallbackError) {
      if (isPixelLimitError(fallbackError)) {
        throw fallbackError;
      }

      console.error("Image processing failed", {
        primary: error instanceof Error ? error.message : String(error),
        fallback: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      throw new Error(IMAGE_PROCESSING_ERROR);
    }
  }
}

function extensionOf(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  return extension && extension !== fileName.toLowerCase() ? extension : "";
}

function isAllowedImageType(file: File, allowedMimeTypes: string[]) {
  const normalizedType = file.type.trim().toLowerCase();
  const extension = extensionOf(file.name);
  const extensionMimeType = EXTENSION_MIME_TYPES[extension];

  if (normalizedType === "image/svg+xml" || extension === "svg") {
    return false;
  }

  if (allowedMimeTypes.includes("image/*")) {
    // Mobile galleries occasionally provide an empty or generic MIME type for a
    // valid photo. Sharp still verifies the binary while converting it to WebP.
    return normalizedType.startsWith("image/") || RASTER_IMAGE_EXTENSIONS.has(extension);
  }

  return (
    allowedMimeTypes.includes(normalizedType) ||
    ((!normalizedType || normalizedType === "application/octet-stream") &&
      Boolean(extensionMimeType && allowedMimeTypes.includes(extensionMimeType)))
  );
}

function looksLikeSvg(input: Buffer) {
  const head = input.subarray(0, 1024).toString("utf8").trimStart().toLowerCase();

  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

function detectOriginalImage(input: Buffer, fileName: string) {
  const extension = extensionOf(fileName);

  if (!ORIGINAL_UPLOAD_EXTENSIONS.has(extension)) {
    return null;
  }

  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return {
      extension: extension === "jpg" ? "jpg" : "jpeg",
      mimeType: "image/jpeg",
    };
  }

  if (
    input.length >= 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47 &&
    input[4] === 0x0d &&
    input[5] === 0x0a &&
    input[6] === 0x1a &&
    input[7] === 0x0a
  ) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (input.length >= 12 && input.subarray(0, 4).toString("ascii") === "RIFF" && input.subarray(8, 12).toString("ascii") === "WEBP") {
    return { extension: "webp", mimeType: "image/webp" };
  }

  if (input.length >= 6) {
    const signature = input.subarray(0, 6).toString("ascii");
    if (signature === "GIF87a" || signature === "GIF89a") {
      return { extension: "gif", mimeType: "image/gif" };
    }
  }

  return null;
}

function isPixelLimitError(error: unknown) {
  return error instanceof Error && /pixel limit|input image exceeds/i.test(error.message);
}

function keyFromPublicUrl(url: string) {
  const baseUrl = serverEnv.r2PublicUrl.replace(/\/+$/, "");
  const prefix = `${baseUrl}/`;

  if (!url.startsWith(prefix)) {
    return null;
  }

  return decodeURIComponent(url.slice(prefix.length));
}

export function isR2PublicUrl(url: string) {
  return Boolean(serverEnv.r2PublicUrl && keyFromPublicUrl(url));
}

export async function uploadImageToR2({
  file,
  folder,
  maxSizeBytes,
  allowedMimeTypes = DEFAULT_ALLOWED_IMAGE_TYPES,
}: UploadImageInput): Promise<UploadedR2Image> {
  if (file.size > maxSizeBytes) {
    throw new Error(`${file.name} maksimum ${Math.floor(maxSizeBytes / 1024 / 1024)}MB ola bilər.`);
  }

  if (!isAllowedImageType(file, allowedMimeTypes)) {
    throw new Error("Yalnız real şəkil faylları qəbul edilir.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  if (looksLikeSvg(input)) {
    throw new Error("SVG şəkillər qəbul edilmir.");
  }

  let processed: ProcessedImage;

  try {
    processed = await convertImageToWebp(input, file.name);
  } catch (error) {
    if (isPixelLimitError(error)) {
      throw new Error("Şəkil ölçüsü çox böyükdür.");
    }

    const originalImage = detectOriginalImage(input, file.name);

    if (!originalImage) {
      throw error;
    }

    processed = {
      data: input,
      fileName: fileNameWithExtension(file.name, originalImage.extension),
      mimeType: originalImage.mimeType,
      width: null,
      height: null,
    };
  }

  const key = `${sanitizeFolder(folder)}/${crypto.randomUUID()}-${processed.fileName}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: serverEnv.r2BucketName,
      Key: key,
      Body: processed.data,
      ContentType: processed.mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: publicUrlForKey(key),
    fileName: processed.fileName,
    mimeType: processed.mimeType,
    sizeBytes: processed.data.byteLength,
    width: processed.width,
    height: processed.height,
  };
}

export async function deleteR2ImageByUrl(url: string) {
  if (!url || !serverEnv.r2PublicUrl) {
    return false;
  }

  const key = keyFromPublicUrl(url);

  if (!key) {
    return false;
  }

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: serverEnv.r2BucketName,
      Key: key,
    }),
  );

  return true;
}

export async function deleteR2ImagesByUrls(urls: Array<string | null | undefined>) {
  const r2Urls = Array.from(
    new Set(urls.filter((url): url is string => Boolean(url && isR2PublicUrl(url)))),
  );

  await Promise.all(r2Urls.map((url) => deleteR2ImageByUrl(url)));
}
