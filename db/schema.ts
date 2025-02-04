import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  title: text("title"),
  organization: text("organization"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const strengths = pgTable("strengths", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), 
  score: integer("score").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coachingNotes = pgTable("coaching_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").default([]),
  conversationId: text("conversation_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price").notNull(),
  type: text("type").notNull(), // 'report' or 'coaching'
  stripePriceId: text("stripe_price_id").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  status: text("status").notNull(), // 'pending', 'completed', 'cancelled'
  stripeSessionId: text("stripe_session_id").notNull(),
  amount: decimal("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  strengths: many(strengths),
  coachingNotes: many(coachingNotes),
  orders: many(orders),
}));

export const strengthsRelations = relations(strengths, ({ one }) => ({
  user: one(users, {
    fields: [strengths.userId],
    references: [users.id],
  }),
}));

export const coachingNotesRelations = relations(coachingNotes, ({ one }) => ({
  user: one(users, {
    fields: [coachingNotes.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orders: many(orders),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const insertStrengthSchema = createInsertSchema(strengths);
export const selectStrengthSchema = createSelectSchema(strengths);
export type InsertStrength = typeof strengths.$inferInsert;
export type SelectStrength = typeof strengths.$inferSelect;

export const insertNoteSchema = createInsertSchema(coachingNotes);
export const selectNoteSchema = createSelectSchema(coachingNotes);
export type InsertNote = typeof coachingNotes.$inferInsert;
export type SelectNote = typeof coachingNotes.$inferSelect;

export const insertProductSchema = createInsertSchema(products);
export const selectProductSchema = createSelectSchema(products);
export type InsertProduct = typeof products.$inferInsert;
export type SelectProduct = typeof products.$inferSelect;

export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);
export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;