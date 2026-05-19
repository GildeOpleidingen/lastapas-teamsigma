import { cookies } from "next/headers";
import {
  createSignedCookieValue,
  readSignedCookieValue,
  timingSafeStringEqual,
} from "@/lib/signed-cookie";

const ADMIN_COOKIE = "admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function getAdminPasscode() {
  return process.env.ADMIN_PASSCODE;
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.APP_SECRET;
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminPasscode() && getAdminSessionSecret());
}

export async function hasAdminSession() {
  const secret = getAdminSessionSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const payload = readSignedCookieValue(
    cookieStore.get(ADMIN_COOKIE)?.value,
    secret
  );
  if (!payload) return false;

  const [scope, issuedAt] = payload.split(":");
  const issuedAtMs = Number(issuedAt);
  if (scope !== "admin" || !Number.isFinite(issuedAtMs)) return false;

  const ageMs = Date.now() - issuedAtMs;
  return ageMs >= 0 && ageMs <= ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
}

export async function verifyAdminPasscode(passcode: string) {
  const configuredPasscode = getAdminPasscode();
  if (!configuredPasscode || !getAdminSessionSecret()) {
    return { ok: false, error: "Admin authentication is not configured." };
  }

  if (typeof passcode !== "string") {
    return { ok: false, error: "Incorrect admin passcode." };
  }

  if (!timingSafeStringEqual(passcode, configuredPasscode)) {
    return { ok: false, error: "Incorrect admin passcode." };
  }

  return { ok: true };
}

export async function setAdminSessionCookie() {
  const secret = getAdminSessionSecret();
  if (!secret) {
    throw new Error("Admin session secret is not configured.");
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_COOKIE,
    createSignedCookieValue(`admin:${Date.now()}`, secret),
    {
      httpOnly: true,
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/admin",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }
  );
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
