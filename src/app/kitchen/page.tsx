export default function KitchenPage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-6 py-10 text-foreground">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Kitchen
        </p>
        <h1 className="text-3xl font-semibold">Kitchen Orders</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        This page is ready for incoming orders and kitchen workflow controls.
      </p>
    </main>
  );
}
