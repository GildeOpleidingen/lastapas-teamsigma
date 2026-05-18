"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, X, Clock, UtensilsCrossed } from "lucide-react";
import { openTable, closeTable } from "../actions";

interface TableRow {
  id: number;
  tableNumber: number;
  status: "available" | "occupied" | "needs_service";
  sessionId: number | null;
  guestCount: number | null;
  accessCode: string | null;
  sessionCreatedAt: number | null;
  roundsOrdered: number | null;
}

type Floor = "first" | "second";

const TABLE_CONFIG: Record<number, { pos: [number, number]; floor: Floor }> = {
  1:  { pos: [12, 28], floor: "first"  },
  2:  { pos: [32, 18], floor: "first"  },
  3:  { pos: [54, 30], floor: "first"  },
  4:  { pos: [73, 18], floor: "first"  },
  5:  { pos: [89, 32], floor: "first"  },
  6:  { pos: [12, 28], floor: "second" },
  7:  { pos: [32, 18], floor: "second" },
  8:  { pos: [54, 30], floor: "second" },
  9:  { pos: [73, 18], floor: "second" },
  10: { pos: [89, 32], floor: "second" },
};

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDurationLong(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

// ── Floor navigation ──────────────────────────────────────────────────────────

function FloorNav({
  active,
  onChange,
  tables,
}: {
  active: Floor;
  onChange: (f: Floor) => void;
  tables: TableRow[];
}) {
  const floors: { id: Floor; label: string }[] = [
    { id: "first",  label: "First Floor"  },
    { id: "second", label: "Second Floor" },
  ];

  function occupiedCount(floor: Floor) {
    return tables.filter(
      t => (TABLE_CONFIG[t.tableNumber]?.floor ?? "first") === floor && t.sessionId !== null
    ).length;
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5 shrink-0">
      {floors.map(f => {
        const count = occupiedCount(f.id);
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors
              ${active === f.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
              }`}
          >
            {f.label}
            {count > 0 && (
              <span
                className={`flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold
                  ${active === f.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function SidebarCard({
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
  const duration = table.sessionCreatedAt && now ? now - table.sessionCreatedAt : null;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all
        ${selected
          ? "border-primary/30 bg-primary/8 ring-1 ring-primary/20"
          : "border-border bg-muted/30 hover:bg-muted/60"
        }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold">{tableLabel(table.tableNumber)}</span>
        {duration !== null && (
          <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
            <Clock size={10} />
            {formatDurationLong(duration)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {table.guestCount && (
          <span className="flex items-center gap-1">
            <Users size={10} />
            {table.guestCount}
          </span>
        )}
        <span className="flex items-center gap-1">
          <UtensilsCrossed size={10} />
          {table.roundsOrdered ?? 0} round{(table.roundsOrdered ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>
      {table.accessCode && (
        <span className="mt-1.5 block font-mono text-[11px] font-bold tracking-[0.2em] text-muted-foreground/70">
          {table.accessCode}
        </span>
      )}
    </button>
  );
}

function Sidebar({
  tables,
  selectedId,
  onSelect,
  now,
}: {
  tables: TableRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  now: number | null;
}) {
  const seated = tables
    .filter(t => t.sessionId !== null)
    .sort((a, b) => (a.sessionCreatedAt ?? 0) - (b.sessionCreatedAt ?? 0));

  return (
    <div className="hidden md:flex w-56 shrink-0 flex-col border-r border-border overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Seated · {seated.length}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {seated.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground/60">
            No tables seated
          </p>
        ) : (
          seated.map(t => (
            <SidebarCard
              key={t.id}
              table={t}
              selected={selectedId === t.id}
              onClick={() => onSelect(t.id)}
              now={now}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Floor plan table ──────────────────────────────────────────────────────────

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
  const duration = occupied && table.sessionCreatedAt && now
    ? now - table.sessionCreatedAt
    : null;

  const cfg = TABLE_CONFIG[table.tableNumber];
  const [left, top] = cfg?.pos ?? [50, 50];

  const color = occupied
    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
    : "bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900/60";

  const ring = selected ? "ring-2 ring-offset-2 ring-primary scale-105" : "";

  return (
    <button
      onClick={onClick}
      style={{ left: `${left}%`, top: `${top}%` }}
      className={`absolute w-[7%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-xl
        flex flex-col items-center justify-center transition-all
        ${color} ${ring}`}
    >
      <span className="text-[0.7em] font-bold leading-none tracking-tight">
        {tableLabel(table.tableNumber)}
      </span>
      {occupied && duration !== null && (
        <span className="text-[0.52em] font-mono leading-none mt-[0.2em] opacity-90">
          {formatDuration(duration)}
        </span>
      )}
      {occupied && table.guestCount && (
        <span className="flex items-center gap-[0.1em] text-[0.45em] leading-none mt-[0.15em] opacity-70">
          <Users className="w-[1.1em] h-[1.1em]" />
          {table.guestCount}
        </span>
      )}
    </button>
  );
}

// ── Table detail panel (desktop, inside floor plan) ───────────────────────────

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
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {table.guestCount} guest{table.guestCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <UtensilsCrossed size={13} />
                {table.roundsOrdered ?? 0} round{(table.roundsOrdered ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {isPending ? "Closing…" : "Close table"}
            </button>
          </div>
          {table.accessCode && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-2.5">
              <span className="text-xs text-muted-foreground">Table code</span>
              <span className="ml-auto font-mono text-lg font-bold tracking-[0.25em]">
                {table.accessCode}
              </span>
            </div>
          )}
        </>
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
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Opening…" : "Open table"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Mobile card + sheet ───────────────────────────────────────────────────────

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
  const duration = occupied && table.sessionCreatedAt && now ? now - table.sessionCreatedAt : null;

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
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users size={13} />{table.guestCount}</span>
            <span className="flex items-center gap-1.5"><UtensilsCrossed size={13} />{table.roundsOrdered ?? 0} rounds</span>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Closing…" : "Close table"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Guests</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setGuestCount(n => Math.max(1, n - 1))} className="h-9 w-9 rounded-full border border-border font-semibold text-lg flex items-center justify-center hover:bg-muted">−</button>
              <span className="w-6 text-center font-semibold tabular-nums text-lg">{guestCount}</span>
              <button onClick={() => setGuestCount(n => Math.min(20, n + 1))} className="h-9 w-9 rounded-full border border-border font-semibold text-lg flex items-center justify-center hover:bg-muted">+</button>
            </div>
          </div>
          <button
            onClick={handleOpen}
            disabled={isPending}
            className="rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Opening…" : "Open table"}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </>
  );
}

// ── Seed prompt ───────────────────────────────────────────────────────────────

function SeedPrompt() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="font-semibold text-lg">No tables set up yet</p>
      <p className="text-sm text-muted-foreground">
        Run <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run seed</code> to create tables.
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TableGrid({ tables }: { tables: TableRow[] }) {
  const [floor, setFloor] = useState<Floor>("first");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const now = useNow();

  if (tables.length === 0) return <SeedPrompt />;

  const visibleTables = tables.filter(
    t => (TABLE_CONFIG[t.tableNumber]?.floor ?? "first") === floor
  );
  const selected = tables.find(t => t.id === selectedId) ?? null;

  const toggle = (id: number) => setSelectedId(prev => (prev === id ? null : id));

  return (
    <>
      {/* ── Desktop ── */}
      <div className="hidden md:flex h-full rounded-2xl border border-border overflow-hidden bg-card">
        <Sidebar tables={tables} selectedId={selectedId} onSelect={toggle} now={now} />

        <div className="flex flex-1 flex-col min-w-0">
          <FloorNav active={floor} onChange={f => { setFloor(f); setSelectedId(null); }} tables={tables} />

          <div className="relative flex-1 overflow-hidden">
            {/* Section label */}
            <span className="absolute top-3 left-4 text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-[0.2em] pointer-events-none">
              {floor === "first" ? "First Floor" : "Second Floor"}
            </span>

            {visibleTables.map(table => (
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
      </div>

      {/* ── Mobile ── */}
      <div className="h-full overflow-y-auto md:hidden">
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
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setSelectedId(null)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-background p-5 shadow-2xl">
              <MobileSheet table={selected} onClose={() => setSelectedId(null)} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
