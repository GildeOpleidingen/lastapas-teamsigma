import { cookies } from "next/headers";
import {
  createSignedCookieValue,
  readSignedCookieValue,
} from "@/lib/signed-cookie";

const TABLE_ACCESS_MAX_AGE_SECONDS = 8 * 60 * 60;

export function tableAccessCookieName(tableNumber: number) {
  return `t${tableNumber}_access`;
}

function tableAccessSecret(accessCode: string) {
  const appSecret =
    process.env.APP_SECRET ?? process.env.ADMIN_SESSION_SECRET;

  if (!appSecret && process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET or ADMIN_SESSION_SECRET is required.");
  }

  return `${appSecret ?? "development-table-access"}:${accessCode}`;
}

export async function setTableAccessCookie(
  tableNumber: number,
  sessionId: number,
  accessCode: string
) {
  const cookieStore = await cookies();
  cookieStore.set(
    tableAccessCookieName(tableNumber),
    createSignedCookieValue(
      `table:${tableNumber}:${sessionId}:${Date.now()}`,
      tableAccessSecret(accessCode)
    ),
    {
      httpOnly: true,
      maxAge: TABLE_ACCESS_MAX_AGE_SECONDS,
      path: `/table/${tableNumber}`,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }
  );
}

export async function hasTableAccess(
  tableNumber: number,
  sessionId: number,
  accessCode: string | null
) {
  if (!accessCode) return false;

  const cookieStore = await cookies();
  const payload = readSignedCookieValue(
    cookieStore.get(tableAccessCookieName(tableNumber))?.value,
    tableAccessSecret(accessCode)
  );
  if (!payload) return false;

  const [scope, payloadTableNumber, payloadSessionId, issuedAt] =
    payload.split(":");
  const issuedAtMs = Number(issuedAt);

  if (
    scope !== "table" ||
    Number(payloadTableNumber) !== tableNumber ||
    Number(payloadSessionId) !== sessionId ||
    !Number.isFinite(issuedAtMs)
  ) {
    return false;
  }

  const ageMs = Date.now() - issuedAtMs;
  return ageMs >= 0 && ageMs <= TABLE_ACCESS_MAX_AGE_SECONDS * 1000;
}
