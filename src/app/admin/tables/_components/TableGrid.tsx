"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import { openTable, closeTable } from "../actions";

interface TableRow {
  id: number;
  tableNumber: number;
  status: "available" | "occupied" | "needs_service";
  sessionId: number | null;
  guestCount: number | null;
  sessionCreatedAt: number | null;
}

type TableShape = "circle" | "square" | "diamond";

// [left%, top%, shape] — center of each table on the floor plan
const TABLE_CONFIG: Record<number, { pos: [number, number]; shape: TableShape }> = {
  1:  { pos: [10, 22], shape: "square"  },
  2:  { pos: [26, 11], shape: "diamond" },
  3:  { pos: [44, 22], shape: "square"  },
  4:  { pos: [62, 11], shape: "square"  },
  5:  { pos: [80, 22], shape: "square"  },
  6:  { pos: [10, 72], shape: "circle"  },
  7:  { pos: [28, 72], shape: "circle"  },
  8:  { pos: [50, 72], shape: "circle"  },
  9:  { pos: [70, 72], shape: "circle"  },
  10: { pos: [86, 72], shape: "circle"  },
};

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function tableLabel(n: number) {
  return `T${String(n).padStart(2, "0")}`;
}

function TableContent({
  table,
  now,
  size = "normal",
}: {
  table: TableRow;
  now: number | null;
  size?: "normal" | "small";
}) {
  const occupied = table.sessionId !== null;
  const duration =
    occupied && table.sessionCreatedAt && now ? now - table.sessionCreatedAt : null;

  if (size === "small") {
    return (
      <>
        <span className="text-[0.62em] font-bold leading-none tracking-tight">
          {tableLabel(table.tableNumber)}
        </span>
        {occupied && duration !== null && (
          <span className="text-[0.5em] font-mono leading-none mt-[0.2em] opacity-90">
            {formatDuration(duration)}
          </span>
        )}
        {occupied && table.guestCount && (
          <span className="flex items-center gap-[0.15em] text-[0.45em] leading-none mt-[0.15em] opacity-75">
            <Users className="w-[1.1em] h-[1.1em]" />
            {table.guestCount}
          </span>
        )}
      </>
    );
  }

  return (
    <>
      <span className="text-[0.68em] font-bold leading-none tracking-tight">
        {tableLabel(table.tableNumber)}
      </span>
      {occupied && duration !== null && (
        <span className="text-[0.52em] font-mono leading-none mt-[0.2em] opacity-90">
          {formatDuration(duration)}
        </span>
      )}
      {occupied && table.guestCount && (
        <span className="flex items-center gap-[0.15em] text-[0.46em] leading-none mt-[0.15em] opacity-75">
          <Users className="w-[1.1em] h-[1.1em]" />
          {table.guestCount}
        </span>
      )}
    </>
  );
}

function FloorTable({
  table,
  selected,
  onClick,
  now,
}: {
  table: TableRow;
  selected: boolean;
  onClick: () => void;
  now: number | null;
}) {
  const occupied = table.sessionId !== null;
  const cfg = TABLE_CONFIG[table.tableNumber] ?? {
    pos: [((table.tableNumber - 1) % 5) * 18 + 10, Math.floor((table.tableNumber - 1) / 5) * 40 + 20] as [number, number],
    shape: "circle" as TableShape,
  };
  const [left, top] = cfg.pos;
  const shape = cfg.shape;

  const color = occupied
    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
    : "bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900/60";

  const ring = selected ? "ring-2 ring-offset-2 ring-primary scale-110" : "";

  if (shape === "diamond") {
    return (
      <div
        style={{ left: `${left}%`, top: `${top}%` }}
        className="absolute w-[10%] aspect-square -translate-x-1/2 -translate-y-1/2"
      >
        <button
          onClick={onClick}
          className={`w-full h-full rotate-45 rounded-md flex items-center justify-center transition-all ${color} ${ring}`}
        >
          <div className="-rotate-45 flex flex-col items-center justify-center gap-0">
            <TableContent table={table} now={now} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{ left: `${left}%`, top: `${top}%` }}
      className={`absolute w-[10%] aspect-square -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all
        ${shape === "circle" ? "rounded-full" : "rounded-xl"}
        ${color} ${ring}
      `}
    >
      <TableContent table={table} now={now} />
    </button>
  );
}

function TablePanel({
  table,
  onClose,
}: {
  table: TableRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [guestCount, setGuestCount] = useState(table.guestCount ?? 2);
  const [error, setError] = useState<string | null>(null);
  const occupied = table.sessionId !== null;

  function handleOpen() {
    startTransition(async () => {
      const result = await openTable(table.id, guestCount);
      if (result.ok) { onClose(); router.refresh(); }
      else setError(result.error ?? "Failed.");
    });
  }

  function handleClose() {
    if (!table.sessionId) return;
    startTransition(async () => {
      const result = await closeTable(table.sessionId!, table.id);
      if (result.ok) { onClose(); router.refresh(); }
      else setError(result.error ?? "Failed.");
    });
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 rounded-t-2xl border-t border-border bg-background/95 backdrop-blur-sm p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Table</p>
          <p className="text-xl font-bold">{tableLabel(table.tableNumber)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
              ${occupied
                ? "bg-primary/10 text-primary"
                : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
              }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${occupied ? "bg-primary" : "bg-green-500"}`} />
            {occupied ? "Occupied" : "Available"}
          </span>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X size={16} />
          </button>
        </div>
      </div>

      {occupied ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} />
            <span>{table.guestCount} guest{table.guestCount !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {isPending ? "Closing…" : "Close table"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Guests</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuestCount(n => Math.max(1, n - 1))}
                className="h-8 w-8 rounded-full border border-border font-semibold text-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                −
              </button>
              <span className="w-5 text-center font-semibold tabular-nums">{guestCount}</span>
              <button
                onClick={() => setGuestCount(n => Math.min(20, n + 1))}
                className="h-8 w-8 rounded-full border border-border font-semibold text-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <button
            onClick={handleOpen}
            disabled={isPending}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Opening…" : "Open table"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SeedPrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="font-semibold text-lg">No tables set up yet</p>
      <p className="text-sm text-muted-foreground">
        Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run seed</code> to create tables.
      </p>
    </div>
  );
}

function MobileTableCard({
  table,
  selected,
  onClick,
  now,
}: {
  table: TableRow;
  selected: boolean;
  onClick: () => void;
  now: number | null;
}) {
  const occupied = table.sessionId !== null;
  const duration =
    occupied && table.sessionCreatedAt && now ? now - table.sessionCreatedAt : null;

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 text-left w-full transition-all
        ${occupied
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900"
        }
        ${selected ? "ring-2 ring-offset-2 ring-primary" : ""}
      `}
    >
      <p className="text-[10px] font-medium opacity-50 uppercase tracking-widest mb-1">Table</p>
      <p className="text-3xl font-bold tabular-nums leading-none">{table.tableNumber}</p>
      {occupied && duration !== null && (
        <p className="mt-2 text-sm font-mono opacity-90">{formatDuration(duration)}</p>
      )}
      {occupied && table.guestCount && (
        <div className="mt-1.5 flex items-center gap-1.5 text-sm opacity-75">
          <Users size={12} />
          <span>{table.guestCount} guests</span>
        </div>
      )}
      {!occupied && <p className="mt-2 text-xs opacity-40">Available</p>}
    </button>
  );
}

export function TableGrid({ tables }: { tables: TableRow[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const now = useNow();

  if (tables.length === 0) return <SeedPrompt />;

  const selected = tables.find(t => t.id === selectedId) ?? null;
  const toggle = (id: number) => setSelectedId(prev => (prev === id ? null : id));

  return (
    <>
      {/* ── Desktop: floor plan ── */}
      <div className="hidden md:block">
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-border bg-card"
          style={{ paddingBottom: "56%" }}
        >
          {/* Floor decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-border/40"
              style={{ top: "48%" }}
            />
            <span className="absolute top-4 left-4 text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em]">
              Section A
            </span>
            <span
              className="absolute left-4 text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em]"
              style={{ top: "52%" }}
            >
              Section B
            </span>
          </div>

          {tables.map(table => (
            <FloorTable
              key={table.id}
              table={table}
              selected={selectedId === table.id}
              onClick={() => toggle(table.id)}
              now={now}
            />
          ))}

          {selected && (
            <TablePanel table={selected} onClose={() => setSelectedId(null)} />
          )}
        </div>
      </div>

      {/* ── Mobile: card grid + fixed bottom sheet ── */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tables.map(table => (
            <MobileTableCard
              key={table.id}
              table={table}
              selected={selectedId === table.id}
              onClick={() => toggle(table.id)}
              now={now}
            />
          ))}
        </div>

        {selected && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setSelectedId(null)}
            />
            {/* Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-background p-5 shadow-2xl">
              <MobileSheet
                table={selected}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function MobileSheet({
  table,
  onClose,
}: {
  table: TableRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [guestCount, setGuestCount] = useState(table.guestCount ?? 2);
  const [error, setError] = useState<string | null>(null);
  const occupied = table.sessionId !== null;

  function handleOpen() {
    startTransition(async () => {
      const result = await openTable(table.id, guestCount);
      if (result.ok) { onClose(); router.refresh(); }
      else setError(result.error ?? "Failed.");
    });
  }

  function handleClose() {
    if (!table.sessionId) return;
    startTransition(async () => {
      const result = await closeTable(table.sessionId!, table.id);
      if (result.ok) { onClose(); router.refresh(); }
      else setError(result.error ?? "Failed.");
    });
  }

  return (
    <>
      {/* Drag handle */}
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Table</p>
          <p className="text-2xl font-bold">{tableLabel(table.tableNumber)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
              ${occupied
                ? "bg-primary/10 text-primary"
                : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
              }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${occupied ? "bg-primary" : "bg-green-500"}`} />
            {occupied ? "Occupied" : "Available"}
          </span>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X size={16} />
          </button>
        </div>
      </div>

      {occupied ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} />
            <span>{table.guestCount} guest{table.guestCount !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {isPending ? "Closing…" : "Close table"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Guests</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuestCount(n => Math.max(1, n - 1))}
                className="h-9 w-9 rounded-full border border-border font-semibold text-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold tabular-nums text-lg">{guestCount}</span>
              <button
                onClick={() => setGuestCount(n => Math.min(20, n + 1))}
                className="h-9 w-9 rounded-full border border-border font-semibold text-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <button
            onClick={handleOpen}
            disabled={isPending}
            className="rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Opening…" : "Open table"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </>
  );
}
