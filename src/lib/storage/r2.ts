import "server-only";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { serverEnv } from "@/lib/config/env.server";

const WEBP_CONTENT_TYPE = "image/webp";
const DEFAULT_WEBP_QUALITY = 82;
const DEFAULT_ALLOWED_IMAGE_TYPES = ["image/*"];
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
  mimeType: typeof WEBP_CONTENT_TYPE;
  sizeBytes: number;
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

function webpFileName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  return `${sanitizePathPart(baseName, "image")}.webp`;
}

function publicUrlForKey(key: string) {
  const baseUrl = serverEnv.r2PublicUrl.replace(/\/+$/, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return `${baseUrl}/${encodedKey}`;
}

async function convertImageToWebp(input: Buffer) {
  try {
    const sharp = (await import("sharp")).default;

    return await sharp(input)
      .rotate()
      .webp({ quality: DEFAULT_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error(IMAGE_PROCESSING_ERROR);
  }
}

function isAllowedImageType(fileType: string, allowedMimeTypes: string[]) {
  const normalizedType = fileType.trim().toLowerCase();

  if (normalizedType === "image/svg+xml") {
    return false;
  }

  if (allowedMimeTypes.includes("image/*")) {
    return !normalizedType || normalizedType.startsWith("image/");
  }

  return allowedMimeTypes.includes(normalizedType);
}

function looksLikeSvg(input: Buffer) {
  const head = input.subarray(0, 1024).toString("utf8").trimStart().toLowerCase();

  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
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

  if (!isAllowedImageType(file.type, allowedMimeTypes)) {
    throw new Error("Yalnız real şəkil faylları qəbul edilir.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  if (looksLikeSvg(input)) {
    throw new Error("SVG şəkillər qəbul edilmir.");
  }

  const converted = await convertImageToWebp(input);
  const fileName = webpFileName(file.name);
  const key = `${sanitizeFolder(folder)}/${crypto.randomUUID()}-${fileName}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: serverEnv.r2BucketName,
      Key: key,
      Body: converted.data,
      ContentType: WEBP_CONTENT_TYPE,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return {
    key,
    url: publicUrlForKey(key),
    fileName,
    mimeType: WEBP_CONTENT_TYPE,
    sizeBytes: converted.data.byteLength,
    width: converted.info.width ?? null,
    height: converted.info.height ?? null,
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
