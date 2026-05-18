"use server";

import { db } from "@/db";
import { restaurantTables, tableSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function seedTables(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({ tableNumber: i + 1 }));
  await db.insert(restaurantTables).values(rows).onConflictDoNothing();
}

export async function openTable(
  tableId: number,
  guestCount: number
): Promise<{ ok: boolean; accessCode?: string; error?: string }> {
  try {
    const [existing] = await db
      .select({ id: tableSessions.id })
      .from(tableSessions)
      .where(
        and(eq(tableSessions.tableId, tableId), eq(tableSessions.status, "active"))
      );

    if (existing) return { ok: false, error: "Table already has an active session." };

    const accessCode = generateAccessCode();

    await db.insert(tableSessions).values({ tableId, guestCount, status: "active", accessCode });
    await db
      .update(restaurantTables)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(eq(restaurantTables.id, tableId));

    return { ok: true, accessCode };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}

export async function closeTable(
  sessionId: number,
  tableId: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    await db
      .update(tableSessions)
      .set({ status: "closed", closedAt: new Date(), updatedAt: new Date() })
      .where(eq(tableSessions.id, sessionId));
    await db
      .update(restaurantTables)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(restaurantTables.id, tableId));

    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong." };
  }
}
