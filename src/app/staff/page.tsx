export default function StaffPage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-6 py-10 text-foreground">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Staff
        </p>
        <h1 className="text-3xl font-semibold">Staff Dashboard</h1>
      </div>
      <p className="max-w-2xl text-muted-foreground">
        This page is ready for service staff tools and table status updates.
      </p>
    </main>
  );
}
