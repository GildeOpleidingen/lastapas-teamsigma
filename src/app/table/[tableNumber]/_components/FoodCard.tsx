import { Plus } from "lucide-react";
import type { menuItems } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type MenuItem = InferSelectModel<typeof menuItems>;

interface FoodCardProps {
  item: MenuItem;
  showPrice: boolean;
  quantity: number;
  onAdd: () => void;
  disabled: boolean;
}

export function FoodCard({ item, showPrice, quantity, onAdd, disabled }: FoodCardProps) {
  const price = (item.currentUnitPriceCents / 100).toFixed(2);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-sm">
      <div className="relative shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-20 w-20 rounded-xl object-cover"
          />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
        {showPrice && (
          <p className="mt-1 text-sm font-semibold text-primary">€{price}</p>
        )}
      </div>

      <div className="relative ml-1 shrink-0">
        <button
          onClick={onAdd}
          disabled={disabled && quantity === 0}
          className="rounded-full bg-primary p-2 text-primary-foreground shadow transition-opacity active:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Add ${item.name}`}
        >
          <Plus size={16} />
        </button>
        {quantity > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
            {quantity}
          </span>
        )}
      </div>
    </div>
  );
}
