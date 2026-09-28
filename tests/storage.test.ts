import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
import { deleteR2ImageByUrl, isR2PublicUrl, uploadImageToR2 } from "@/lib/storage/r2";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = mocks.send; },
  PutObjectCommand: class { constructor(public input: unknown) {} },
  DeleteObjectCommand: class { constructor(public input: unknown) {} },
}));
vi.mock("@/lib/config/env.server", () => ({ serverEnv: {
  hasR2Config: true, r2PublicUrl: "https://images.example.test", r2BucketName: "test-bucket",
} }));
beforeEach(() => { mocks.send.mockResolvedValue({}); });

it.each([
  ["script.svg", "image/svg+xml", "<svg><script>alert(1)</script></svg>"],
  ["script.jpg", "image/jpeg", "<svg><script>alert(1)</script></svg>"],
  ["script.html", "text/html", "<script>alert(1)</script>"],
  ["fake.png", "image/png", "not a real image"],
])("rejects active or fake image content (%s)", async (name, type, content) => {
  await expect(uploadImageToR2({ file: new File([content], name, { type }), folder: "test", maxSizeBytes: 1024 })).rejects.toThrow();
  expect(mocks.send).not.toHaveBeenCalled();
});
it("rejects oversized uploads before storage", async () => {
  await expect(uploadImageToR2({ file: new File(["12345"], "image.png", { type: "image/png" }), folder: "test", maxSizeBytes: 4 })).rejects.toThrow();
  expect(mocks.send).not.toHaveBeenCalled();
});
it("converts real raster images to WebP before storage", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
  const uploaded = await uploadImageToR2({ file: new File([new Uint8Array(png)], "test.png", { type: "image/png" }), folder: "products/test", maxSizeBytes: 1024 });
  expect(uploaded.mimeType).toBe("image/webp");
  expect(uploaded.width).toBe(8);
  expect(uploaded.key).toMatch(/^products\/test\/.*\.webp$/);
  expect(mocks.send.mock.calls[0][0].input.ContentType).toBe("image/webp");
});
it.each(["https://evil.test/test.webp", "https://images.example.test.evil.test/test.webp", "https://images.example.test/test%", "https://images.example.test/"])("ignores external or malformed deletion URLs (%s)", async (url) => {
  expect(isR2PublicUrl(url)).toBe(false);
  expect(await deleteR2ImageByUrl(url)).toBe(false);
  expect(mocks.send).not.toHaveBeenCalled();
});
it("strips query and fragment from an owned R2 key", async () => {
  expect(await deleteR2ImageByUrl("https://images.example.test/products/test.webp?width=80#preview")).toBe(true);
  expect(mocks.send.mock.calls[0][0].input.Key).toBe("products/test.webp");
});
