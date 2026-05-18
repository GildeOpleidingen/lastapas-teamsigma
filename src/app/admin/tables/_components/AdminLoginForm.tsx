"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "../actions";

export function AdminLoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await loginAdmin(passcode);
      if (result.ok) {
        setPasscode("");
        router.refresh();
      } else {
        setError(result.error ?? "Unable to sign in.");
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-4 text-center"
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold">Tables</h1>
        </div>

        <input
          type="password"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          placeholder="Admin passcode"
          autoComplete="current-password"
          className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-center outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={!passcode || isPending}
          className="rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
