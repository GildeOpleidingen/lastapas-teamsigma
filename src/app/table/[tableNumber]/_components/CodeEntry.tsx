"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyTableCode } from "../actions";

export function CodeEntry({
  tableId,
  sessionId,
}: {
  tableId: number;
  sessionId: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyTableCode(tableId, sessionId, code);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Incorrect code.");
        setCode("");
      }
    });
  }

  return (
    <div className="w-full max-w-xs text-center">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
        Table {tableId}
      </p>
      <h1 className="text-2xl font-bold mb-8">Enter your table code</h1>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          maxLength={6}
          placeholder="XXXXXX"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-border bg-muted/30 px-5 py-4 text-center font-mono text-3xl font-bold tracking-[0.4em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={code.length !== 6 || isPending}
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {isPending ? "Verifying…" : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground/50">
        The code is on your table or ask your server.
      </p>
    </div>
  );
}
