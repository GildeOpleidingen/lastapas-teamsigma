import { notFound } from "next/navigation";
import { db } from "@/db";
import { menuItems, orders, restaurantTables, tableSessions } from "@/db/schema";
import { ORDER_COOLDOWN_MS } from "@/lib/order-policy";
import { and, desc, eq } from "drizzle-orm";
import { MenuContent } from "./_components/MenuContent";

export default async function TablePage({
  params,
}: PageProps<"/table/[tableNumber]">) {
  const { tableNumber } = await params;
  const tableId = Number(tableNumber);

  if (!Number.isInteger(tableId) || tableId <= 0) {
    notFound();
  }

  const [table] = await db
    .select()
    .from(restaurantTables)
    .where(eq(restaurantTables.tableNumber, tableId));

  const [session] = table
    ? await db
        .select()
        .from(tableSessions)
        .where(
          and(
            eq(tableSessions.tableId, table.id),
            eq(tableSessions.status, "active")
          )
        )
    : [];

  if (!session) {
    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="text-lg font-semibold">Table {tableId}</p>
        <p className="text-muted-foreground">
          Ask a staff member to open your table to start ordering.
        </p>
      </main>
    );
  }

  const [lastOrder] = await db
    .select({ createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.tableSessionId, session.id))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true))
    .orderBy(menuItems.displayOrder);

  return (
    <main className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <MenuContent
        tableId={tableId}
        items={items}
        sessionId={session.id}
        guestCount={session.guestCount}
        cooldownEndsAt={
          lastOrder ? lastOrder.createdAt.getTime() + ORDER_COOLDOWN_MS : null
        }
      />
    </main>
  );
}
