import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { menuItems, orders, restaurantTables, tableSessions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { MenuContent } from "./_components/MenuContent";
import { CodeEntry } from "./_components/CodeEntry";

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
    .where(eq(restaurantTables.tableNumber, tableId))
    .catch(() => []);

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
        .catch(() => [])
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

  // Code gate — check cookie against session ID so re-opened tables require a new code
  if (session.accessCode) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(`t${tableId}_access`);
    const verified = accessCookie?.value === String(session.id);

    if (!verified) {
      return (
        <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-6 text-foreground">
          <CodeEntry tableId={tableId} sessionId={session.id} />
        </main>
      );
    }
  }

  const [lastOrder] = await db
    .select({ createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.tableSessionId, session.id))
    .orderBy(desc(orders.createdAt))
    .limit(1)
    .catch(() => []);

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true))
    .orderBy(menuItems.displayOrder)
    .catch(() => []);

  return (
    <main className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <MenuContent
        tableId={tableId}
        items={items}
        sessionId={session.id}
        guestCount={session.guestCount}
        lastOrderAt={lastOrder?.createdAt.getTime() ?? null}
      />
    </main>
  );
}
