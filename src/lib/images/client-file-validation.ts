"use client";

const IMAGE_EXTENSIONS = new Set([
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

function extensionOf(name: string) {
  const extension = name.split(".").pop()?.trim().toLowerCase();

  return extension && extension !== name.toLowerCase() ? extension : "";
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function hasImageSignature(bytes: Uint8Array) {
  if (bytes.length < 4) {
    return false;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  if (
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return true;
  }

  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return true;
  }

  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") {
    return true;
  }

  if (ascii(bytes, 0, 2) === "BM") {
    return true;
  }

  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  ) {
    return true;
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4).toLowerCase();

    return ["avif", "avis", "heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
  }

  return false;
}

export async function isRealImageFile(file: File) {
  const type = file.type.trim().toLowerCase();
  const extension = extensionOf(file.name);

  if (type === "image/svg+xml" || extension === "svg") {
    return false;
  }

  if (extension && !IMAGE_EXTENSIONS.has(extension)) {
    return false;
  }

  if (type && !type.startsWith("image/")) {
    return false;
  }

  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  return hasImageSignature(bytes);
}
