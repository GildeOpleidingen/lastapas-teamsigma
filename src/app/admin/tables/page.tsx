import { db } from "@/db";
import { restaurantTables, tableSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { TableGrid } from "./_components/TableGrid";

export default async function AdminTablesPage() {
  const tables = await db
    .select({
      id: restaurantTables.id,
      tableNumber: restaurantTables.tableNumber,
      status: restaurantTables.status,
      sessionId: tableSessions.id,
      guestCount: tableSessions.guestCount,
      sessionCreatedAt: tableSessions.createdAt,
    })
    .from(restaurantTables)
    .leftJoin(
      tableSessions,
      and(
        eq(tableSessions.tableId, restaurantTables.id),
        eq(tableSessions.status, "active")
      )
    )
    .orderBy(restaurantTables.tableNumber)
    .catch(() => []);

  return (
    <main className="flex h-dvh flex-col gap-4 overflow-hidden bg-background px-4 py-6 text-foreground">
      <div className="shrink-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Admin
        </p>
        <h1 className="text-2xl font-bold">Tables</h1>
      </div>
      <div className="min-h-0 flex-1">
        <TableGrid tables={tables.map(t => ({ ...t, sessionCreatedAt: t.sessionCreatedAt?.getTime() ?? null }))} />
      </div>
    </main>
  );
}
