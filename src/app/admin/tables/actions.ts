"use server";

import { db } from "@/db";
import { restaurantTables } from "@/db/schema";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";
import {
  clearAdminSessionCookie,
  hasAdminSession,
  setAdminSessionCookie,
  verifyAdminPasscode,
} from "@/lib/admin-auth";
import { triggerRealtime } from "@/lib/pusher-server";

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[randomInt(chars.length)]
  ).join("");
}

async function requireAdmin() {
  if (await hasAdminSession()) return null;
  return { ok: false as const, error: "Unauthorized." };
}

function isValidId(value: number) {
  return Number.isInteger(value) && value > 0;
}

export async function loginAdmin(
  passcode: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await verifyAdminPasscode(passcode);
  if (!result.ok) return result;

  await setAdminSessionCookie();
  revalidatePath("/admin/tables");

  return { ok: true };
}

export async function logoutAdmin() {
  await clearAdminSessionCookie();
  revalidatePath("/admin/tables");
}

export async function seedTables(
  count: number
): Promise<{ ok: boolean; error?: string }> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return { ok: false, error: "Table count must be between 1 and 100." };
  }

  const rows = Array.from({ length: count }, (_, i) => ({ tableNumber: i + 1 }));
  await db.insert(restaurantTables).values(rows).onConflictDoNothing();
  revalidatePath("/admin/tables");
  await triggerRealtime("admin-tables", "refresh", {});

  return { ok: true };
}

export async function openTable(
  tableId: number,
  guestCount: number
): Promise<{ ok: boolean; accessCode?: string; error?: string }> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  if (!isValidId(tableId)) {
    return { ok: false, error: "Invalid table." };
  }

  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
    return { ok: false, error: "Guest count must be between 1 and 20." };
  }

  try {
    const accessCode = generateAccessCode();
    const result = await db.execute<{ accessCode: string }>(sql`
      WITH created AS (
        INSERT INTO "table_sessions" ("table_id", "guest_count", "status", "access_code")
        SELECT ${tableId}, ${guestCount}, 'active', ${accessCode}
        WHERE EXISTS (
          SELECT 1 FROM "restaurant_tables" WHERE "id" = ${tableId}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "table_sessions"
          WHERE "table_id" = ${tableId} AND "status" = 'active'
        )
        RETURNING "table_id", "access_code"
      ),
      updated AS (
        UPDATE "restaurant_tables" AS rt
        SET "status" = 'occupied', "updated_at" = now()
        FROM created
        WHERE rt."id" = created."table_id"
        RETURNING rt."id"
      )
      SELECT "access_code" AS "accessCode" FROM created
    `);

    const created = result.rows[0];
    if (!created) {
      return { ok: false, error: "Table not found or already has an active session." };
    }

    revalidatePath("/admin/tables");
    await triggerRealtime("admin-tables", "refresh", {});

    return { ok: true, accessCode: created.accessCode };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

export async function closeTable(
  sessionId: number,
  tableId: number
): Promise<{ ok: boolean; error?: string }> {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  if (!isValidId(sessionId) || !isValidId(tableId)) {
    return { ok: false, error: "Invalid table session." };
  }

  try {
    const result = await db.execute<{ id: number }>(sql`
      WITH closed AS (
        UPDATE "table_sessions"
        SET "status" = 'closed', "closed_at" = now(), "updated_at" = now()
        WHERE "id" = ${sessionId}
          AND "table_id" = ${tableId}
          AND "status" = 'active'
        RETURNING "table_id"
      ),
      updated AS (
        UPDATE "restaurant_tables" AS rt
        SET "status" = 'available', "updated_at" = now()
        FROM closed
        WHERE rt."id" = closed."table_id"
        RETURNING rt."id"
      )
      SELECT "id" FROM updated
    `);

    if (result.rows.length === 0) {
      return { ok: false, error: "Active table session not found." };
    }

    revalidatePath("/admin/tables");
    await triggerRealtime("admin-tables", "refresh", {});

    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}
