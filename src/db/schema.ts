import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const tableStatusEnum = pgEnum("table_status", [
  "available",
  "occupied",
  "needs_service",
]);

export const tableSessionStatusEnum = pgEnum("table_session_status", [
  "active",
  "paid",
  "closed",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled",
]);

export const restaurantTables = pgTable("restaurant_tables", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tableNumber: integer("table_number").notNull().unique(),
  status: tableStatusEnum("status").notNull().default("available"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const tableSessions = pgTable(
  "table_sessions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tableId: integer("table_id")
      .notNull()
      .references(() => restaurantTables.id),
    status: tableSessionStatusEnum("status").notNull().default("active"),
    guestCount: integer("guest_count"),
    accessCode: varchar("access_code", { length: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    index("table_sessions_table_id_idx").on(table.tableId),
    // Partial index for fast active-session lookup per table
    index("table_sessions_active_table_id_idx")
      .on(table.tableId)
      .where(sql`status = 'active'`),
  ],
);

export const menuItems = pgTable("menu_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  category: varchar("category", { length: 100 }).notNull(),
  currentUnitPriceCents: integer("current_unit_price_cents").notNull(),
  imageUrl: varchar("image_url", { length: 1000 }),
  displayOrder: integer("display_order").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tableSessionId: integer("table_session_id")
      .notNull()
      .references(() => tableSessions.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    roundNumber: integer("round_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("orders_session_id_idx").on(table.tableSessionId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_menu_item_id_idx").on(table.menuItemId),
  ],
);

// Separate table so each unit of an order item can carry its own note.
// e.g. 3× burger: one "no pickles", one "extra cheese", one plain.
export const orderItemNotes = pgTable(
  "order_item_notes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderItemId: integer("order_item_id")
      .notNull()
      .references(() => orderItems.id),
    unitIndex: integer("unit_index").notNull(), // 0-based, identifies which unit this note applies to
    note: varchar("note", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_item_notes_order_item_id_idx").on(table.orderItemId),
  ],
);

export const restaurantTablesRelations = relations(
  restaurantTables,
  ({ many }) => ({
    sessions: many(tableSessions),
  }),
);

export const tableSessionsRelations = relations(
  tableSessions,
  ({ one, many }) => ({
    table: one(restaurantTables, {
      fields: [tableSessions.tableId],
      references: [restaurantTables.id],
    }),
    orders: many(orders),
  }),
);

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(tableSessions, {
    fields: [orders.tableSessionId],
    references: [tableSessions.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  notes: many(orderItemNotes),
}));

export const orderItemNotesRelations = relations(orderItemNotes, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemNotes.orderItemId],
    references: [orderItems.id],
  }),
}));