import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

function scrypt(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number },
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options as any, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

function unwrapEnvValue(value: string) {
  const trimmed = value.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  if (
    trimmed.length >= 2 &&
    ((first === "'" && last === "'") ||
      (first === '"' && last === '"') ||
      (first === "`" && last === "`"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export async function verifyTelegramAdminPassword(input: {
  password: string;
  hash: string;
}) {
  const [algorithm, nRaw, rRaw, pRaw, salt, expectedHex] = unwrapEnvValue(input.hash).split("$");

  if (algorithm !== "scrypt" || !salt || !expectedHex) {
    return false;
  }

  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = await scrypt(input.password, salt, expected.length, {
      N,
      r,
      p,
    });

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
