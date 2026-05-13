type TablePageProps = {
  params: Promise<{
    tableNumber: string;
  }>;
};

export default async function TablePage({ params }: TablePageProps) {
  const { tableNumber } = await params;

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-6 py-10 text-foreground">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Guest table
        </p>
        <h1 className="text-3xl font-semibold">Table {tableNumber}</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        This page is ready for the table ordering experience.
      </p>
    </main>
  );
}
