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
    <main className="flex min-h-screen flex-col gap-6 bg-background px-4 py-8 text-foreground">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Admin
        </p>
        <h1 className="text-2xl font-bold">Tables</h1>
      </div>
      <TableGrid tables={tables.map(t => ({ ...t, sessionCreatedAt: t.sessionCreatedAt?.getTime() ?? null }))} />
    </main>
  );
}
