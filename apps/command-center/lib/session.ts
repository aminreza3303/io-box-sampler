export const AUTH_COOKIE_NAME = "moqarr_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type SessionPayload = { sub: string; exp: number; iat: number };

const encoder = new TextEncoder();

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function sessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SESSION_SECRET must be at least 16 characters");
  return secret;
}

async function sign(input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(input))));
}

export async function createSessionToken(userId: string, expiresAt = Date.now() + SESSION_TTL_MS): Promise<string> {
  const payload: SessionPayload = { sub: userId, exp: expiresAt, iat: Date.now() };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${await sign(encodedPayload)}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature || token.split(".").length !== 2) throw new Error("malformed session");
    const expected = await sign(encodedPayload);
    if (signature.length !== expected.length) throw new Error("invalid session signature");
    const signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - signature.length % 4) % 4)), (char) => char.charCodeAt(0));
    const expectedBytes = Uint8Array.from(atob(expected.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - expected.length % 4) % 4)), (char) => char.charCodeAt(0));
    let mismatch = 0;
    for (let index = 0; index < expectedBytes.length; index += 1) mismatch |= signatureBytes[index] ^ expectedBytes[index];
    if (mismatch !== 0) throw new Error("invalid session signature");
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(base64UrlDecode(encodedPayload), (char) => char.charCodeAt(0)))) as SessionPayload;
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number" || payload.exp <= Date.now()) throw new Error("expired session");
    return payload;
  } catch {
    throw new Error("Invalid or expired session");
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
