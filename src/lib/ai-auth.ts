import { NextRequest } from "next/server";
import {
  verifyJWT,
  generateAnonId,
  generateRandomColor,
  AuthPayload,
  AnonymousData,
} from "@/lib/session";
import { verifyRecaptcha } from "@/lib/recaptcha";

function decodeCookieValue(value: string): string {
  let decoded = value;
  try {
    while (true) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return value;
  }
  return decoded;
}

function isRecaptchaRequired(): boolean {
  return !!process.env.RECAPTCHA_API_KEY;
}

export async function verifyRecaptchaToken(token?: string): Promise<boolean> {
  if (!isRecaptchaRequired()) return true;
  if (!token) return false;
  return verifyRecaptcha(token);
}

export function extractAuth(req: NextRequest): AuthPayload | null {
  const authHeader = req.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    const match = cookieHeader?.match(/auth-token=([^;]+)/);
    token = match ? match[1] : null;
  }

  return token ? verifyJWT(token) : null;
}

export function getAnonData(req: NextRequest): AnonymousData {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) {
    return {
      anonId: generateAnonId(),
      anonTextColor: generateRandomColor(),
      anonTextBackground: generateRandomColor(),
    };
  }

  const anonIdMatch = cookieHeader.match(/anon-id=([^;]+)/);
  const anonTextColorMatch = cookieHeader.match(/anon-text-color=([^;]+)/);
  const anonTextBackgroundMatch = cookieHeader.match(/anon-text-background=([^;]+)/);

  if (anonIdMatch && anonTextColorMatch && anonTextBackgroundMatch) {
    return {
      anonId: decodeCookieValue(anonIdMatch[1]),
      anonTextColor: decodeCookieValue(anonTextColorMatch[1]),
      anonTextBackground: decodeCookieValue(anonTextBackgroundMatch[1]),
    };
  }

  return {
    anonId: generateAnonId(),
    anonTextColor: generateRandomColor(),
    anonTextBackground: generateRandomColor(),
  };
}
