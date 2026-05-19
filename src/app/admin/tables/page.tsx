import { db } from "@/db";
import { restaurantTables, tableSessions, orders } from "@/db/schema";
import { and, eq, max } from "drizzle-orm";
import { connection } from "next/server";
import { TableGrid } from "./_components/TableGrid";
import { AdminLoginForm } from "./_components/AdminLoginForm";
import { isAdminAuthConfigured, hasAdminSession } from "@/lib/admin-auth";
import { logoutAdmin } from "./actions";

export default async function AdminTablesPage() {
  await connection();

  if (!isAdminAuthConfigured()) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="text-lg font-semibold">Admin auth is not configured</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Add ADMIN_PASSCODE and APP_SECRET or ADMIN_SESSION_SECRET to your
          environment before using the table admin.
        </p>
      </main>
    );
  }

  if (!(await hasAdminSession())) {
    return <AdminLoginForm />;
  }

  const tables = await db
    .select({
      id: restaurantTables.id,
      tableNumber: restaurantTables.tableNumber,
      status: restaurantTables.status,
      sessionId: tableSessions.id,
      guestCount: tableSessions.guestCount,
      sessionCreatedAt: tableSessions.createdAt,
      roundsOrdered: max(orders.roundNumber),
    })
    .from(restaurantTables)
    .leftJoin(
      tableSessions,
      and(
        eq(tableSessions.tableId, restaurantTables.id),
        eq(tableSessions.status, "active")
      )
    )
    .leftJoin(orders, eq(orders.tableSessionId, tableSessions.id))
    .groupBy(restaurantTables.id, tableSessions.id)
    .orderBy(restaurantTables.tableNumber);

  return (
    <main className="flex h-dvh flex-col gap-4 overflow-hidden bg-background px-4 py-6 text-foreground">
      <div className="shrink-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Admin
        </p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Tables</h1>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <TableGrid
          tables={tables.map(t => ({
            ...t,
            sessionCreatedAt: t.sessionCreatedAt?.getTime() ?? null,
            roundsOrdered: t.roundsOrdered ?? null,
          }))}
        />
      </div>
    </main>
  );
}
