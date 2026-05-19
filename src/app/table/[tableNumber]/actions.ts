"use server";

import { db } from "@/db";
import { menuItems, orders, restaurantTables, tableSessions } from "@/db/schema";
import { ORDER_COOLDOWN_MS } from "@/lib/order-policy";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { triggerRealtime } from "@/lib/pusher-server";

const MAX_TOTAL_ITEMS = 100;
const MAX_QUANTITY_PER_LINE = 50;

interface OrderLine {
  menuItemId: number;
  quantity: number;
}

type PlaceOrderResult =
  | { ok: true; cooldownEndsAt: number }
  | { ok: false; error?: string; cooldownEndsAt?: number };

interface ActiveTableSession {
  id: number;
  tableId: number;
  guestCount: number | null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isValidId(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

function cooldownEndsAtFor(createdAt: Date) {
  return createdAt.getTime() + ORDER_COOLDOWN_MS;
}

function cooldownError(cooldownEndsAt: number): PlaceOrderResult {
  return {
    ok: false,
    error: "Still in cooldown. Please wait before ordering again.",
    cooldownEndsAt,
  };
}

async function getActiveTableSession(
  tableNumber: number,
  sessionId: number
): Promise<ActiveTableSession | null> {
  const [session] = await db
    .select({
      id: tableSessions.id,
      tableId: tableSessions.tableId,
      guestCount: tableSessions.guestCount,
    })
    .from(tableSessions)
    .innerJoin(restaurantTables, eq(restaurantTables.id, tableSessions.tableId))
    .where(
      and(
        eq(tableSessions.id, sessionId),
        eq(tableSessions.status, "active"),
        eq(restaurantTables.tableNumber, tableNumber)
      )
    );

  return session ?? null;
}

function normalizeOrderLines(
  lines: unknown
): { lines: OrderLine[] } | { error: string } {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Choose at least one item." };
  }

  if (lines.length > MAX_TOTAL_ITEMS) {
    return { error: "Too many items in this order." };
  }

  const quantityByItemId = new Map<number, number>();

  for (const line of lines) {
    if (!line || typeof line !== "object") {
      return { error: "Invalid order item." };
    }

    const { menuItemId, quantity } = line as {
      menuItemId?: unknown;
      quantity?: unknown;
    };

    if (isInteger(menuItemId) && menuItemId < 0) {
      return { error: "The menu hasn't been set up yet. Ask a staff member." };
    }

    if (
      !isInteger(menuItemId) ||
      menuItemId <= 0 ||
      !isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY_PER_LINE
    ) {
      return { error: "Invalid order item." };
    }

    const nextQuantity = (quantityByItemId.get(menuItemId) ?? 0) + quantity;
    if (nextQuantity > MAX_QUANTITY_PER_LINE) {
      return { error: "Invalid order item." };
    }

    quantityByItemId.set(menuItemId, nextQuantity);
  }

  const normalized = [...quantityByItemId.entries()].map(
    ([menuItemId, quantity]) => ({ menuItemId, quantity })
  );
  const totalItems = normalized.reduce((sum, line) => sum + line.quantity, 0);

  if (totalItems > MAX_TOTAL_ITEMS) {
    return { error: "Too many items in this order." };
  }

  return { lines: normalized };
}

export async function callStaff(
  tableNumber: unknown,
  sessionId: unknown
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidId(tableNumber) || !isValidId(sessionId)) {
    return { ok: false, error: "Invalid table session." };
  }

  const session = await getActiveTableSession(tableNumber, sessionId);
  if (!session) return { ok: false, error: "Session not found." };

  try {
    await db
      .update(restaurantTables)
      .set({ status: "needs_service", updatedAt: new Date() })
      .where(eq(restaurantTables.id, session.tableId));

    revalidatePath("/admin/tables");
    await triggerRealtime("admin-tables", "refresh", {});
    await triggerRealtime("staff-calls", "refresh", {
      tableNumber,
      sessionId,
    });

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not call staff. Please try again." };
  }
}

export async function placeOrder(
  tableNumber: unknown,
  sessionId: unknown,
  lines: unknown
): Promise<PlaceOrderResult> {
  try {
    if (!isValidId(tableNumber) || !isValidId(sessionId)) {
      return { ok: false, error: "Invalid table session." };
    }

    const session = await getActiveTableSession(tableNumber, sessionId);
    if (!session) return { ok: false, error: "Session not found." };

    const normalized = normalizeOrderLines(lines);
    if ("error" in normalized) return { ok: false, error: normalized.error };

    const itemIds = normalized.lines.map((line) => line.menuItemId);
    const availableItems = await db
      .select({
        id: menuItems.id,
        category: menuItems.category,
        unitPriceCents: menuItems.currentUnitPriceCents,
      })
      .from(menuItems)
      .where(and(eq(menuItems.isAvailable, true), inArray(menuItems.id, itemIds)));

    const itemById = new Map(availableItems.map((item) => [item.id, item]));
    if (itemIds.some((id) => !itemById.has(id))) {
      return { ok: false, error: "One or more items are no longer available." };
    }

    const maxItems = (session.guestCount ?? 2) * 2;
    const foodItems = normalized.lines
      .filter((line) => itemById.get(line.menuItemId)?.category !== "Drinks")
      .reduce((sum, line) => sum + line.quantity, 0);

    if (foodItems > maxItems) {
      return { ok: false, error: `Maximum ${maxItems} food items per round.` };
    }

    const [lastOrder] = await db
      .select({ createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.tableSessionId, sessionId))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (lastOrder) {
      const cooldownEndsAt = cooldownEndsAtFor(lastOrder.createdAt);
      if (Date.now() < cooldownEndsAt) {
        return cooldownError(cooldownEndsAt);
      }
    }

    const payload = normalized.lines.map((line) => {
      const item = itemById.get(line.menuItemId);
      if (!item) throw new Error("Missing validated menu item.");

      return {
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        unitPriceCents: item.unitPriceCents,
      };
    });

    const result = await db.execute<{ orderId: number }>(sql`
      WITH lock_guard AS (
        SELECT pg_advisory_xact_lock(${sessionId}::bigint) AS locked
      ),
      validated_session AS (
        SELECT ts."id"
        FROM "table_sessions" AS ts
        INNER JOIN "restaurant_tables" AS rt ON rt."id" = ts."table_id"
        INNER JOIN lock_guard ON true
        WHERE ts."id" = ${sessionId}
          AND ts."status" = 'active'
          AND rt."table_number" = ${tableNumber}
          AND NOT EXISTS (
            SELECT 1
            FROM "orders" AS o
            WHERE o."table_session_id" = ts."id"
              AND o."created_at" > now() - (${ORDER_COOLDOWN_MS} * interval '1 millisecond')
          )
      ),
      next_round AS (
        SELECT COALESCE(MAX(o."round_number"), 0) + 1 AS "round_number"
        FROM "orders" AS o
        WHERE o."table_session_id" = ${sessionId}
      ),
      created_order AS (
        INSERT INTO "orders" ("table_session_id", "round_number")
        SELECT validated_session."id", next_round."round_number"
        FROM validated_session
        CROSS JOIN next_round
        RETURNING "id"
      ),
      line_items AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS line_items(
          "menuItemId" integer,
          "quantity" integer,
          "unitPriceCents" integer
        )
      ),
      inserted_items AS (
        INSERT INTO "order_items" (
          "order_id",
          "menu_item_id",
          "quantity",
          "unit_price_cents"
        )
        SELECT
          created_order."id",
          line_items."menuItemId",
          line_items."quantity",
          line_items."unitPriceCents"
        FROM created_order
        CROSS JOIN line_items
        RETURNING "id"
      )
      SELECT "id" AS "orderId" FROM created_order
    `);

    const createdOrder = result.rows[0];
    if (!createdOrder) {
      const [latestOrder] = await db
        .select({ createdAt: orders.createdAt })
        .from(orders)
        .where(eq(orders.tableSessionId, sessionId))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      return cooldownError(
        latestOrder ? cooldownEndsAtFor(latestOrder.createdAt) : Date.now() + ORDER_COOLDOWN_MS
      );
    }

    const [createdOrderRow] = await db
      .select({ createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.id, createdOrder.orderId))
      .limit(1);

    revalidatePath("/admin/tables");
    await triggerRealtime("admin-tables", "refresh", {});

    return {
      ok: true,
      cooldownEndsAt: cooldownEndsAtFor(createdOrderRow?.createdAt ?? new Date()),
    };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
