import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { restaurantTables, menuItems } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const items = [
  // Popular
  { name: "Patatas Bravas", description: "Crispy fried potatoes with spicy brava sauce and garlic aioli", category: "Popular", currentUnitPriceCents: 750, displayOrder: 0 },
  { name: "Gambas al Ajillo", description: "Sizzling prawns in olive oil with chili and parsley", category: "Popular", currentUnitPriceCents: 1200, displayOrder: 1 },
  { name: "Croquetas de Jamón", description: "Creamy ham croquettes with a crispy golden crust", category: "Popular", currentUnitPriceCents: 900, displayOrder: 2 },
  { name: "Tortilla Española", description: "Traditional Spanish omelette with potato and caramelised onions", category: "Popular", currentUnitPriceCents: 850, displayOrder: 3 },

  // Cold Tapas
  { name: "Pan con Tomate", description: "Toasted bread rubbed with fresh tomato and extra virgin olive oil", category: "Cold Tapas", currentUnitPriceCents: 550, displayOrder: 0 },
  { name: "Jamón Ibérico", description: "Premium Iberian cured ham, thinly sliced", category: "Cold Tapas", currentUnitPriceCents: 1600, displayOrder: 1 },
  { name: "Anchoas del Cantábrico", description: "Hand-filleted anchovies in olive oil", category: "Cold Tapas", currentUnitPriceCents: 1100, displayOrder: 2 },

  // Hot Tapas
  { name: "Pimientos de Padrón", description: "Pan-fried Padrón peppers with sea salt flakes", category: "Hot Tapas", currentUnitPriceCents: 700, displayOrder: 0 },
  { name: "Champiñones al Ajillo", description: "Sautéed mushrooms with garlic and fresh herbs", category: "Hot Tapas", currentUnitPriceCents: 800, displayOrder: 1 },
  { name: "Calamares a la Romana", description: "Lightly battered squid rings with lemon aioli", category: "Hot Tapas", currentUnitPriceCents: 1050, displayOrder: 2 },

  // Meat
  { name: "Albóndigas en Salsa", description: "Slow-cooked meatballs in a rich tomato and herb sauce", category: "Meat", currentUnitPriceCents: 1100, displayOrder: 0 },
  { name: "Chorizo a la Sidra", description: "Sliced chorizo braised in Asturian cider", category: "Meat", currentUnitPriceCents: 950, displayOrder: 1 },
  { name: "Secreto Ibérico", description: "Grilled Iberian pork shoulder with smoked paprika", category: "Meat", currentUnitPriceCents: 1800, displayOrder: 2 },

  // Fish
  { name: "Boquerones en Vinagre", description: "Fresh anchovies marinated in white wine vinegar and garlic", category: "Fish", currentUnitPriceCents: 900, displayOrder: 0 },
  { name: "Pulpo a la Gallega", description: "Galician-style octopus with paprika, olive oil, and sea salt", category: "Fish", currentUnitPriceCents: 1500, displayOrder: 1 },
  { name: "Bacalao al Pil-Pil", description: "Salt cod in a silky garlic and olive oil emulsion", category: "Fish", currentUnitPriceCents: 1400, displayOrder: 2 },

  // Desserts
  { name: "Crema Catalana", description: "Silky custard with a caramelised sugar crust", category: "Desserts", currentUnitPriceCents: 650, displayOrder: 0 },
  { name: "Churros con Chocolate", description: "Crispy fried dough sticks with thick hot chocolate dip", category: "Desserts", currentUnitPriceCents: 700, displayOrder: 1 },
  { name: "Tarta de Santiago", description: "Traditional almond tart dusted with icing sugar", category: "Desserts", currentUnitPriceCents: 600, displayOrder: 2 },

  // Drinks
  { name: "Cerveza Estrella", description: "Refreshing Spanish lager on tap", category: "Drinks", currentUnitPriceCents: 350, displayOrder: 0 },
  { name: "Vino Tinto de la Casa", description: "House red wine, Rioja Tempranillo", category: "Drinks", currentUnitPriceCents: 450, displayOrder: 1 },
  { name: "Agua con Gas", description: "Sparkling mineral water", category: "Drinks", currentUnitPriceCents: 250, displayOrder: 2 },
  { name: "Sangría de la Casa", description: "House sangria with seasonal fruit", category: "Drinks", currentUnitPriceCents: 550, displayOrder: 3 },
];

async function main() {
  const tables = Array.from({ length: 10 }, (_, i) => ({ tableNumber: i + 1 }));
  await db.insert(restaurantTables).values(tables).onConflictDoNothing();
  console.log("✓ Seeded 10 tables.");

  await db.insert(menuItems).values(items).onConflictDoNothing();
  console.log(`✓ Seeded ${items.length} menu items.`);
}

main().catch(console.error);
