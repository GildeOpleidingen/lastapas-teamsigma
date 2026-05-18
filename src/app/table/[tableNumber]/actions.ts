"use server";

import { db } from "@/db";
import { menuItems, orders, orderItems, tableSessions } from "@/db/schema";
import { and, eq, count, desc } from "drizzle-orm";
import { cookies } from "next/headers";

const COOLDOWN_MS = 10 * 1000; // TODO: change back to 10 * 60 * 1000 for production

export async function verifyTableCode(
  tableId: number,
  sessionId: number,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const [session] = await db
    .select({ accessCode: tableSessions.accessCode })
    .from(tableSessions)
    .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.status, "active")));

  if (!session || session.accessCode?.toUpperCase() !== code.toUpperCase().trim()) {
    return { ok: false, error: "Incorrect code. Ask your server." };
  }

  const cookieStore = await cookies();
  cookieStore.set(`t${tableId}_access`, String(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    path: `/table/${tableId}`,
  });

  return { ok: true };
}

interface OrderLine {
  menuItemId: number;
  quantity: number;
  unitPriceCents: number;
}

export async function placeOrder(
  sessionId: number,
  lines: OrderLine[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Re-fetch session to validate guest count server-side
    const [session] = await db
      .select({ guestCount: tableSessions.guestCount })
      .from(tableSessions)
      .where(eq(tableSessions.id, sessionId));

    if (!session) return { ok: false, error: "Session not found." };

    const maxItems = (session.guestCount ?? 2) * 2;
    // Drinks are excluded from the per-person limit — fetch categories to check
    const itemCategories = await db
      .select({ id: menuItems.id, category: menuItems.category })
      .from(menuItems)
      .where(eq(menuItems.isAvailable, true));
    const categoryById = new Map(itemCategories.map((i) => [i.id, i.category]));
    const foodItems = lines
      .filter((l) => categoryById.get(l.menuItemId) !== "Drinks")
      .reduce((s, l) => s + l.quantity, 0);
    if (foodItems > maxItems) {
      return { ok: false, error: `Maximum ${maxItems} food items per round.` };
    }

    // Re-validate cooldown server-side
    const [lastOrder] = await db
      .select({ createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.tableSessionId, sessionId))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (lastOrder && Date.now() - lastOrder.createdAt.getTime() < COOLDOWN_MS) {
      return { ok: false, error: "Still in cooldown. Please wait before ordering again." };
    }

    // Reject placeholder items (negative IDs — not in DB yet)
    const itemIds = [...new Set(lines.map((l) => l.menuItemId))];
    if (itemIds.some((id) => id < 0)) {
      return { ok: false, error: "The menu hasn't been set up yet. Ask a staff member." };
    }

    // Validate all menuItemIds exist and are available
    const availableItems = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.isAvailable, true));
    const availableIds = new Set(availableItems.map((i) => i.id));
    if (itemIds.some((id) => !availableIds.has(id))) {
      return { ok: false, error: "One or more items are no longer available." };
    }

    // Determine round number
    const [{ value: existingRounds }] = await db
      .select({ value: count() })
      .from(orders)
      .where(eq(orders.tableSessionId, sessionId));

    const roundNumber = existingRounds + 1;

    const [newOrder] = await db
      .insert(orders)
      .values({ tableSessionId: sessionId, roundNumber })
      .returning({ id: orders.id });

    await db.insert(orderItems).values(
      lines.map((l) => ({
        orderId: newOrder.id,
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
      }))
    );

    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
