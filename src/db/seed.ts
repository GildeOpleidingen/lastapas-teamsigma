import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { restaurantTables, menuItems } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const items = [
  // Cold Tapas
  { name: "Aceitunas marinadas", description: "Gemarineerde olijven met olijfolie, knoflook en kruiden.", category: "Cold Tapas", currentUnitPriceCents: 450, displayOrder: 0 },
  { name: "Pan con tomate", description: "Geroosterd brood met verse tomaat, olijfolie en zout.", category: "Cold Tapas", currentUnitPriceCents: 500, displayOrder: 1 },
  { name: "Tabla de quesos españoles", description: "Selectie van Spaanse kazen zoals manchego en geitenkaas.", category: "Cold Tapas", currentUnitPriceCents: 1100, displayOrder: 2 },
  { name: "Jamón serrano", description: "Gedroogde Spaanse ham met een zoute, rijke smaak.", category: "Cold Tapas", currentUnitPriceCents: 1400, displayOrder: 3 },
  { name: "Ensalada de atún", description: "Tonijnsalade met ui, tomaat en olijfolie.", category: "Cold Tapas", currentUnitPriceCents: 900, displayOrder: 4 },
  { name: "Gazpacho", description: "Koude soep van tomaat, paprika en komkommer.", category: "Cold Tapas", currentUnitPriceCents: 700, displayOrder: 5 },
  { name: "Salmorejo", description: "Dikke koude tomatensoep met brood, ei en ham.", category: "Cold Tapas", currentUnitPriceCents: 750, displayOrder: 6 },
  { name: "Ensalada mixta", description: "Gemengde salade met sla, tomaat, ei en olijven.", category: "Cold Tapas", currentUnitPriceCents: 700, displayOrder: 7 },
  { name: "Boquerones en vinagre", description: "Ansjovis gemarineerd in azijn en knoflook.", category: "Cold Tapas", currentUnitPriceCents: 850, displayOrder: 8 },
  { name: "Cóctel de gambas", description: "Garnalen met een romige cocktailsaus.", category: "Cold Tapas", currentUnitPriceCents: 1100, displayOrder: 9 },

  // Hot Tapas
  { name: "Patatas bravas", description: "Gebakken aardappelen met pittige saus.", category: "Hot Tapas", currentUnitPriceCents: 700, displayOrder: 0 },
  { name: "Patatas alioli", description: "Aardappelen met knoflooksaus.", category: "Hot Tapas", currentUnitPriceCents: 700, displayOrder: 1 },
  { name: "Gambas al ajillo", description: "Garnalen gebakken in knoflook en olie.", category: "Hot Tapas", currentUnitPriceCents: 1200, displayOrder: 2 },
  { name: "Calamares fritos", description: "Gefrituurde inktvisringen.", category: "Hot Tapas", currentUnitPriceCents: 1050, displayOrder: 3 },
  { name: "Croquetas", description: "Gefrituurde kroketjes gevuld met ham, kaas of kip.", category: "Hot Tapas", currentUnitPriceCents: 900, displayOrder: 4 },
  { name: "Dátiles con bacon", description: "Dadels omwikkeld met spek.", category: "Hot Tapas", currentUnitPriceCents: 850, displayOrder: 5 },
  { name: "Alitas de pollo", description: "Kippenvleugels met kruiden, gefrituurd of gebakken.", category: "Hot Tapas", currentUnitPriceCents: 1000, displayOrder: 6 },
  { name: "Pollo al ajillo", description: "Kip gebakken met knoflook en olie.", category: "Hot Tapas", currentUnitPriceCents: 1100, displayOrder: 7 },
  { name: "Chorizo a la sidra", description: "Chorizoworst gekookt in cider.", category: "Hot Tapas", currentUnitPriceCents: 950, displayOrder: 8 },
  { name: "Chorizo al vino", description: "Chorizoworst bereid in rode wijnsaus.", category: "Hot Tapas", currentUnitPriceCents: 950, displayOrder: 9 },
  { name: "Pimientos de padrón", description: "Kleine groene pepers gebakken met zout.", category: "Hot Tapas", currentUnitPriceCents: 700, displayOrder: 10 },
  { name: "Champiñones al ajillo", description: "Champignons in knoflookolie.", category: "Hot Tapas", currentUnitPriceCents: 800, displayOrder: 11 },

  // Specialties
  { name: "Tortilla española", description: "Spaanse omelet met aardappel en ui.", category: "Specialties", currentUnitPriceCents: 850, displayOrder: 0 },
  { name: "Huevos rotos", description: "Gebakken eieren met aardappelen en ham.", category: "Specialties", currentUnitPriceCents: 950, displayOrder: 1 },
  { name: "Pinchos morunos", description: "Gekruide vleesspiesjes.", category: "Specialties", currentUnitPriceCents: 1100, displayOrder: 2 },
  { name: "Pulpo a la gallega", description: "Octopus met paprikapoeder en olijfolie.", category: "Specialties", currentUnitPriceCents: 1500, displayOrder: 3 },
  { name: "Mini paella de mariscos", description: "Kleine paella met zeevruchten zoals garnalen en mosselen.", category: "Specialties", currentUnitPriceCents: 1400, displayOrder: 4 },
  { name: "Mini paella de pollo", description: "Kleine paella met kip en groenten.", category: "Specialties", currentUnitPriceCents: 1200, displayOrder: 5 },
  { name: "Paella mixta", description: "Kleine portie paella met vlees en vis samen.", category: "Specialties", currentUnitPriceCents: 1300, displayOrder: 6 },
  { name: "Empanadillas", description: "Kleine gevulde deegpakketjes met vlees of vis.", category: "Specialties", currentUnitPriceCents: 800, displayOrder: 7 },
  { name: "Berenjenas fritas con miel", description: "Gefrituurde aubergine met honing.", category: "Specialties", currentUnitPriceCents: 850, displayOrder: 8 },
  { name: "Lomo a la plancha", description: "Gegrild varkensvlees.", category: "Specialties", currentUnitPriceCents: 1600, displayOrder: 9 },
  { name: "Montaditos variados", description: "Kleine broodjes met verschillende belegsoorten.", category: "Specialties", currentUnitPriceCents: 750, displayOrder: 10 },
  { name: "Pan con alioli", description: "Brood met knoflooksaus.", category: "Specialties", currentUnitPriceCents: 500, displayOrder: 11 },

  // Desserts
  { name: "Crema catalana", description: "Dessert met custard en een krokante suikerlaag.", category: "Desserts", currentUnitPriceCents: 650, displayOrder: 0 },
  { name: "Flan", description: "Pudding van ei en karamel.", category: "Desserts", currentUnitPriceCents: 600, displayOrder: 1 },
  { name: "Arroz con leche", description: "Rijst gekookt in melk met suiker en kaneel.", category: "Desserts", currentUnitPriceCents: 600, displayOrder: 2 },
  { name: "Churros con chocolate", description: "Gefrituurd deeg met warme chocoladesaus.", category: "Desserts", currentUnitPriceCents: 700, displayOrder: 3 },
  { name: "Tarta de Santiago", description: "Amandeltaart uit Spanje.", category: "Desserts", currentUnitPriceCents: 600, displayOrder: 4 },
  { name: "Leche frita", description: "Gefrituurd melkgebak met suiker.", category: "Desserts", currentUnitPriceCents: 650, displayOrder: 5 },
  { name: "Helado de vainilla", description: "Vanille-ijs.", category: "Desserts", currentUnitPriceCents: 550, displayOrder: 6 },
  { name: "Natillas", description: "Zoete custard met kaneel.", category: "Desserts", currentUnitPriceCents: 600, displayOrder: 7 },
  { name: "Fresas con nata", description: "Aardbeien met slagroom.", category: "Desserts", currentUnitPriceCents: 650, displayOrder: 8 },

  // Drinks
  { name: "Vino tinto", description: "Rode wijn, vaak stevig en vol van smaak (bij vleesgerechten).", category: "Drinks", currentUnitPriceCents: 450, displayOrder: 0 },
  { name: "Vino blanco", description: "Witte wijn, fris en licht (bij vis en lichte tapas).", category: "Drinks", currentUnitPriceCents: 450, displayOrder: 1 },
  { name: "Vino rosado", description: "Rosé wijn, een frisse mix tussen rood en wit.", category: "Drinks", currentUnitPriceCents: 450, displayOrder: 2 },
  { name: "Sangría", description: "Wijn gemengd met fruit, suiker en soms frisdrank.", category: "Drinks", currentUnitPriceCents: 550, displayOrder: 3 },
  { name: "Tinto de verano", description: "Rode wijn met frisdrank en ijs, een lichtere variant van sangria.", category: "Drinks", currentUnitPriceCents: 450, displayOrder: 4 },
  { name: "Cerveza", description: "Bier, zoals bekende Spaanse merken (bijv. Estrella).", category: "Drinks", currentUnitPriceCents: 350, displayOrder: 5 },
  { name: "Agua mineral", description: "Mineraalwater, met of zonder koolzuur.", category: "Drinks", currentUnitPriceCents: 250, displayOrder: 6 },
  { name: "Refrescos", description: "Frisdranken zoals cola, sinaasappel en citroenlimonade.", category: "Drinks", currentUnitPriceCents: 300, displayOrder: 7 },
  { name: "Zumo de naranja", description: "Sinaasappelsap, vaak vers geperst.", category: "Drinks", currentUnitPriceCents: 350, displayOrder: 8 },
  { name: "Café solo", description: "Sterke zwarte koffie (espresso).", category: "Drinks", currentUnitPriceCents: 250, displayOrder: 9 },
  { name: "Café con leche", description: "Koffie met melk.", category: "Drinks", currentUnitPriceCents: 300, displayOrder: 10 },
  { name: "Cortado", description: "Koffie met een klein beetje melk.", category: "Drinks", currentUnitPriceCents: 275, displayOrder: 11 },
];

async function main() {
  const tables = Array.from({ length: 10 }, (_, i) => ({ tableNumber: i + 1 }));
  await db.insert(restaurantTables).values(tables).onConflictDoNothing();
  console.log("✓ Seeded 10 tables.");

  await db.delete(menuItems);
  console.log("✓ Cleared existing menu items.");

  await db.insert(menuItems).values(items);
  console.log(`✓ Seeded ${items.length} menu items.`);
}

main().catch(console.error);
