import { notFound } from "next/navigation";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MenuContent } from "./_components/MenuContent";

export default async function TablePage({
  params,
}: PageProps<"/table/[tableNumber]">) {
  const { tableNumber } = await params;
  const tableId = Number(tableNumber);

  if (!Number.isInteger(tableId) || tableId <= 0) {
    notFound();
  }

  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.isAvailable, true))
    .orderBy(menuItems.displayOrder)
    .catch(() => []);

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <MenuContent tableId={tableId} items={items} />
    </main>
  );
}
