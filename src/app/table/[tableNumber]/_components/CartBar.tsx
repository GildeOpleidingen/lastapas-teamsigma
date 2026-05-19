"use client";

import { useState, useEffect, useTransition } from "react";
import { CheckCircle } from "lucide-react";
import { placeOrder } from "../actions";

interface CartItem {
  menuItemId: number;
  name: string;
  category: string;
  quantity: number;
  unitPriceCents: number;
}

interface CartBarProps {
  cart: CartItem[];
  maxItems: number;
  tableId: number;
  sessionId: number;
  lastOrderAt: number | null;
  onOrderPlaced: (placedAt: number) => void;
}

const COOLDOWN_MS = 10 * 1000; // TODO: change back to 10 * 60 * 1000 for production

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function CartBar({
  cart,
  maxItems,
  tableId,
  sessionId,
  lastOrderAt,
  onOrderPlaced,
}: CartBarProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [localLastOrderAt, setLocalLastOrderAt] = useState(lastOrderAt);

  const cooldownEnds = localLastOrderAt ? localLastOrderAt + COOLDOWN_MS : null;
  const remainingMs = cooldownEnds ? cooldownEnds - now : 0;
  const inCooldown = remainingMs > 0;

  useEffect(() => {
    if (!inCooldown && cart.length === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [inCooldown, cart.length]);

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const foodItems = cart.filter((i) => i.category !== "Drinks").reduce((s, i) => s + i.quantity, 0);

  if (!inCooldown && cart.length === 0) return null;

  function handleSubmit() {
    if (isPending || inCooldown || cart.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await placeOrder(
        tableId,
        sessionId,
        cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity }))
      );
      if (result.ok) {
        const placedAt = Date.now();
        setLocalLastOrderAt(placedAt);
        onOrderPlaced(placedAt);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-20 rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl">
      {inCooldown ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm font-medium">Order placed</span>
          </div>
          <span className="text-sm font-semibold">
            Next round in {formatCountdown(remainingMs)}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {totalItems} item{totalItems !== 1 ? "s" : ""}{" "}
              <span className="opacity-60">({foodItems} of {maxItems} food)</span>
            </span>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity active:opacity-70 disabled:opacity-50"
            >
              {isPending ? "Placing…" : "Place order"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
