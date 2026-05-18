"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { openTable, closeTable } from "../actions";

interface TableRow {
  id: number;
  tableNumber: number;
  status: "available" | "occupied" | "needs_service";
  sessionId: number | null;
  guestCount: number | null;
}

interface TableGridProps {
  tables: TableRow[];
}

function TableCard({ table }: { table: TableRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpening, setIsOpening] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const isOccupied = table.sessionId !== null;

  function handleOpen() {
    setIsOpening(true);
    setError(null);
  }

  function handleConfirmOpen() {
    startTransition(async () => {
      const result = await openTable(table.id, guestCount);
      if (result.ok) {
        setIsOpening(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to open table.");
      }
    });
  }

  function handleClose() {
    if (!table.sessionId) return;
    startTransition(async () => {
      const result = await closeTable(table.sessionId!, table.id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to close table.");
      }
    });
  }

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isOccupied ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-base">Table {table.tableNumber}</span>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${isOccupied ? "text-green-600" : "text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${isOccupied ? "bg-green-500" : "bg-muted-foreground/40"}`} />
          {isOccupied ? "Occupied" : "Available"}
        </span>
      </div>

      {isOccupied && table.guestCount && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users size={14} />
          <span>{table.guestCount} guest{table.guestCount !== 1 ? "s" : ""}</span>
        </div>
      )}

      {isOpening && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">How many guests?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
              className="h-8 w-8 rounded-full border border-border text-lg font-semibold flex items-center justify-center"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{guestCount}</span>
            <button
              onClick={() => setGuestCount((n) => Math.min(20, n + 1))}
              className="h-8 w-8 rounded-full border border-border text-lg font-semibold flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 mt-auto">
        {isOccupied ? (
          <button
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-full border border-border py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Closing…" : "Close table"}
          </button>
        ) : isOpening ? (
          <>
            <button
              onClick={() => setIsOpening(false)}
              className="flex-1 rounded-full border border-border py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmOpen}
              disabled={isPending}
              className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "Opening…" : "Confirm"}
            </button>
          </>
        ) : (
          <button
            onClick={handleOpen}
            className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Open
          </button>
        )}
      </div>
    </div>
  );
}

function SeedPrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="font-semibold text-lg">No tables set up yet</p>
      <p className="text-sm text-muted-foreground">
        Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run seed</code> in your terminal to create the tables.
      </p>
    </div>
  );
}

export function TableGrid({ tables }: TableGridProps) {
  if (tables.length === 0) return <SeedPrompt />;

  return (
    <div className="grid grid-cols-2 gap-3">
      {tables.map((table) => (
        <TableCard key={table.id} table={table} />
      ))}
    </div>
  );
}
