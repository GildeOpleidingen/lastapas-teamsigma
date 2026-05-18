"use client";

import { Clock } from "lucide-react";
import { CATEGORIES } from "./MenuContent";

interface MenuHeaderProps {
  tableId: number;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function MenuHeader({ tableId, activeCategory, onCategoryChange }: MenuHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">Las Tapas</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Order history"
          >
            <Clock size={18} />
          </button>
          <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
            Table {tableId}
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground hover:bg-muted"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
