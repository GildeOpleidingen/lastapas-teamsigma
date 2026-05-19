"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";
import type { menuItems } from "@/db/schema";
import { MenuHeader } from "./MenuHeader";
import { FoodCard } from "./FoodCard";
import { CartBar } from "./CartBar";
import { CallStaffButton } from "./CallStaffButton";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

type MenuItem = InferSelectModel<typeof menuItems>;

interface CartItem {
  menuItemId: number;
  name: string;
  category: string;
  quantity: number;
  unitPriceCents: number;
}

export const CATEGORIES = [
  "Popular",
  "Cold Tapas",
  "Hot Tapas",
  "Specialties",
  "Meat",
  "Fish",
  "Desserts",
  "Drinks",
];

const t = new Date(0);

const PLACEHOLDER_ITEMS: Record<string, MenuItem[]> = {
  Popular: [
    { id: -1, name: "Patatas Bravas", description: "Crispy fried potatoes with spicy brava sauce and garlic aioli", category: "Popular", currentUnitPriceCents: 750, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -2, name: "Gambas al Ajillo", description: "Sizzling prawns in olive oil with chili and parsley", category: "Popular", currentUnitPriceCents: 1200, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -3, name: "Croquetas de Jamón", description: "Creamy ham croquettes with a crispy golden crust", category: "Popular", currentUnitPriceCents: 900, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -4, name: "Tortilla Española", description: "Traditional Spanish omelette with potato and caramelised onions", category: "Popular", currentUnitPriceCents: 850, imageUrl: null, displayOrder: 3, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  "Cold Tapas": [
    { id: -5, name: "Pan con Tomate", description: "Toasted bread rubbed with fresh tomato and extra virgin olive oil", category: "Cold Tapas", currentUnitPriceCents: 550, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -6, name: "Jamón Ibérico", description: "Premium Iberian cured ham, thinly sliced", category: "Cold Tapas", currentUnitPriceCents: 1600, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -7, name: "Anchoas del Cantábrico", description: "Hand-filleted anchovies in olive oil", category: "Cold Tapas", currentUnitPriceCents: 1100, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  "Hot Tapas": [
    { id: -8, name: "Pimientos de Padrón", description: "Pan-fried Padrón peppers with sea salt flakes", category: "Hot Tapas", currentUnitPriceCents: 700, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -9, name: "Champiñones al Ajillo", description: "Sautéed mushrooms with garlic and fresh herbs", category: "Hot Tapas", currentUnitPriceCents: 800, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -10, name: "Calamares a la Romana", description: "Lightly battered squid rings with lemon aioli", category: "Hot Tapas", currentUnitPriceCents: 1050, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  Specialties: [
    { id: -24, name: "Tortilla Espanola", description: "Traditional Spanish omelette with potato and onion", category: "Specialties", currentUnitPriceCents: 850, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -25, name: "Pulpo a la Gallega", description: "Galician-style octopus with paprika and olive oil", category: "Specialties", currentUnitPriceCents: 1500, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -26, name: "Mini Paella", description: "Small paella with saffron rice and seasonal toppings", category: "Specialties", currentUnitPriceCents: 1300, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  Meat: [
    { id: -11, name: "Albóndigas en Salsa", description: "Slow-cooked meatballs in a rich tomato and herb sauce", category: "Meat", currentUnitPriceCents: 1100, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -12, name: "Chorizo a la Sidra", description: "Sliced chorizo braised in Asturian cider", category: "Meat", currentUnitPriceCents: 950, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -13, name: "Secreto Ibérico", description: "Grilled Iberian pork shoulder with smoked paprika", category: "Meat", currentUnitPriceCents: 1800, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  Fish: [
    { id: -14, name: "Boquerones en Vinagre", description: "Fresh anchovies marinated in white wine vinegar and garlic", category: "Fish", currentUnitPriceCents: 900, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -15, name: "Pulpo a la Gallega", description: "Galician-style octopus with paprika, olive oil, and sea salt", category: "Fish", currentUnitPriceCents: 1500, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -16, name: "Bacalao al Pil-Pil", description: "Salt cod in a silky garlic and olive oil emulsion", category: "Fish", currentUnitPriceCents: 1400, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  Desserts: [
    { id: -17, name: "Crema Catalana", description: "Silky custard with a caramelised sugar crust", category: "Desserts", currentUnitPriceCents: 650, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -18, name: "Churros con Chocolate", description: "Crispy fried dough sticks with thick hot chocolate dip", category: "Desserts", currentUnitPriceCents: 700, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -19, name: "Tarta de Santiago", description: "Traditional almond tart dusted with icing sugar", category: "Desserts", currentUnitPriceCents: 600, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
  ],
  Drinks: [
    { id: -20, name: "Cerveza Estrella", description: "Refreshing Spanish lager on tap", category: "Drinks", currentUnitPriceCents: 350, imageUrl: null, displayOrder: 0, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -21, name: "Vino Tinto de la Casa", description: "House red wine, Rioja Tempranillo", category: "Drinks", currentUnitPriceCents: 450, imageUrl: null, displayOrder: 1, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -22, name: "Agua con Gas", description: "Sparkling mineral water", category: "Drinks", currentUnitPriceCents: 250, imageUrl: null, displayOrder: 2, isAvailable: true, createdAt: t, updatedAt: t },
    { id: -23, name: "Sangría de la Casa", description: "House sangria with seasonal fruit", category: "Drinks", currentUnitPriceCents: 550, imageUrl: null, displayOrder: 3, isAvailable: true, createdAt: t, updatedAt: t },
  ],
};

interface MenuContentProps {
  tableId: number;
  items: MenuItem[];
  sessionId: number;
  guestCount: number | null;
  cooldownEndsAt: number | null;
}

export function MenuContent({
  tableId,
  items,
  sessionId,
  guestCount,
  cooldownEndsAt,
}: MenuContentProps) {
  useRealtimeRefresh("menu");

  // 60 s fallback in case Pusher connection drops
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [router]);

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const maxItems = (guestCount ?? 2) * 2;
  const foodInCart = cart.filter((i) => i.category !== "Drinks").reduce((s, i) => s + i.quantity, 0);

  function addToCart(item: MenuItem) {
    if (item.category !== "Drinks" && foodInCart >= maxItems) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, category: item.category, quantity: 1, unitPriceCents: item.currentUnitPriceCents }];
    });
  }

  const dbItems = items.filter((item) => item.category === activeCategory);
  const displayItems = dbItems.length > 0 ? dbItems : (PLACEHOLDER_ITEMS[activeCategory] ?? []);
  const showPrice = activeCategory === "Drinks";

  return (
    <>
      <MenuHeader
        tableId={tableId}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <div className="flex flex-col gap-3 px-4 py-4 pb-32">
        <div>
          <h2 className="text-xl font-bold">{activeCategory}</h2>
          <p className="text-sm text-muted-foreground">Guest favorites</p>
        </div>
        <div className="flex flex-col gap-3">
          {displayItems.map((item) => {
            const cartEntry = cart.find((c) => c.menuItemId === item.id);
            const quantity = cartEntry?.quantity ?? 0;
            const capReached = item.category !== "Drinks" && foodInCart >= maxItems;
            return (
              <FoodCard
                key={item.id}
                item={item}
                showPrice={showPrice}
                quantity={quantity}
                onAdd={() => addToCart(item)}
                disabled={capReached}
              />
            );
          })}
        </div>
      </div>
      <CartBar
        cart={cart}
        maxItems={maxItems}
        tableId={tableId}
        sessionId={sessionId}
        cooldownEndsAt={cooldownEndsAt}
        onOrderPlaced={() => {
          setCart([]);
        }}
      />
      <CallStaffButton tableId={tableId} sessionId={sessionId} />
    </>
  );
}
