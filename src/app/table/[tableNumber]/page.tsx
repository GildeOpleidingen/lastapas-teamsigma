import { notFound } from "next/navigation";

export default async function TablePage({
  params,
}: PageProps<"/table/[tableNumber]">) {
  const { tableNumber } = await params;
  const tableId = Number(tableNumber);

  if (!Number.isInteger(tableId) || tableId <= 0) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-6 py-10 text-foreground">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Guest table
        </p>
        <h1 className="text-3xl font-semibold">Table {tableId}</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        This page is ready for the table ordering experience.
      </p>
    </main>
  );
}
