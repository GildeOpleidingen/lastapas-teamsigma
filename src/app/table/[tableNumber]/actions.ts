"use server";

import { db } from "@/db";
import { menuItems, orders, restaurantTables, tableSessions } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { triggerRealtime } from "@/lib/pusher-server";
import { hasTableAccess, setTableAccessCookie } from "@/lib/table-access";

const COOLDOWN_MS = 10 * 1000; // TODO: change back to 10 * 60 * 1000 for production
const MAX_TOTAL_ITEMS = 100;
const MAX_QUANTITY_PER_LINE = 50;

interface OrderLine {
  menuItemId: number;
  quantity: number;
}

interface ActiveTableSession {
  id: number;
  tableId: number;
  guestCount: number | null;
  accessCode: string | null;
}

function isValidId(value: number) {
  return Number.isInteger(value) && value > 0;
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
      accessCode: tableSessions.accessCode,
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

function normalizeOrderLines(lines: OrderLine[]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "Choose at least one item." };
  }

  const quantityByItemId = new Map<number, number>();

  for (const line of lines) {
    if (!line || typeof line !== "object") {
      return { error: "Invalid order item." };
    }

    const { menuItemId, quantity } = line;

    if (menuItemId < 0) {
      return { error: "The menu hasn't been set up yet. Ask a staff member." };
    }

    if (
      !Number.isInteger(menuItemId) ||
      menuItemId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY_PER_LINE
    ) {
      return { error: "Invalid order item." };
    }

    quantityByItemId.set(
      menuItemId,
      (quantityByItemId.get(menuItemId) ?? 0) + quantity
    );
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

export async function verifyTableCode(
  tableNumber: number,
  sessionId: number,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidId(tableNumber) || !isValidId(sessionId)) {
    return { ok: false, error: "Invalid table session." };
  }

  if (typeof code !== "string") {
    return { ok: false, error: "Incorrect code. Ask your server." };
  }

  const session = await getActiveTableSession(tableNumber, sessionId);
  const normalizedCode = code.toUpperCase().trim();

  if (!session || session.accessCode?.toUpperCase() !== normalizedCode) {
    return { ok: false, error: "Incorrect code. Ask your server." };
  }

  await setTableAccessCookie(tableNumber, session.id, session.accessCode);

  return { ok: true };
}

export async function callStaff(
  tableNumber: number,
  sessionId: number
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidId(tableNumber) || !isValidId(sessionId)) {
    return { ok: false, error: "Invalid table session." };
  }

  const session = await getActiveTableSession(tableNumber, sessionId);
  if (!session) return { ok: false, error: "Session not found." };

  if (!(await hasTableAccess(tableNumber, sessionId, session.accessCode))) {
    return { ok: false, error: "Enter your table code again." };
  }

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
  tableNumber: number,
  sessionId: number,
  lines: OrderLine[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!isValidId(tableNumber) || !isValidId(sessionId)) {
      return { ok: false, error: "Invalid table session." };
    }

    const session = await getActiveTableSession(tableNumber, sessionId);
    if (!session) return { ok: false, error: "Session not found." };

    if (!(await hasTableAccess(tableNumber, sessionId, session.accessCode))) {
      return { ok: false, error: "Enter your table code again." };
    }

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

    if (lastOrder && Date.now() - lastOrder.createdAt.getTime() < COOLDOWN_MS) {
      return {
        ok: false,
        error: "Still in cooldown. Please wait before ordering again.",
      };
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
              AND o."created_at" > now() - (${COOLDOWN_MS} * interval '1 millisecond')
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

    if (result.rows.length === 0) {
      return {
        ok: false,
        error: "Still in cooldown. Please wait before ordering again.",
      };
    }

    revalidatePath("/admin/tables");
    await triggerRealtime("admin-tables", "refresh", {});

    return { ok: true };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
