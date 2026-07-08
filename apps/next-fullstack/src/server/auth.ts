import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { User } from "@/generated/prisma";

const DEFAULT_SECRET = "local-dev-secret-change-me";

type TokenPayload = {
  sub: string;
  phone: string;
  name: string;
  shopId: string;
  role: string;
  tokenId?: string;
  exp: number;
};

export type AuthUser = Omit<TokenPayload, "exp"> & { id: string };

export function makeRefreshToken() {
  return randomUUID();
}

export function signAccessToken(user: Pick<User, "id" | "phone" | "name" | "shopId" | "role">, tokenId?: string) {
  const payload: TokenPayload = {
    sub: user.id,
    phone: user.phone,
    name: user.name,
    shopId: user.shopId,
    role: user.role,
    tokenId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
  };
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyAccessToken(token: string): AuthUser | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.sub, sub: payload.sub, phone: payload.phone, name: payload.name, shopId: payload.shopId, role: payload.role, tokenId: payload.tokenId };
  } catch {
    return null;
  }
}

function getSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
