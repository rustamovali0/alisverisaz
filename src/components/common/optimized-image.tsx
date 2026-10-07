import Image, { type ImageProps } from "next/image";

const PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxMiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEyIiBmaWxsPSIjZjFmNWY5Ii8+PC9zdmc+";

export function isOptimizableImage(src: ImageProps["src"]) {
  if (typeof src !== "string") return true;
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === "images.alisveris.az";
  } catch {
    return false;
  }
}

export function OptimizedImage(props: ImageProps) {
  return <Image {...props} unoptimized={!isOptimizableImage(props.src)} placeholder="blur" blurDataURL={props.blurDataURL || PLACEHOLDER} />;
}
