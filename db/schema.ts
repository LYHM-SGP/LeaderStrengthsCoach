import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  strengths: many(strengths),
  coachingNotes: many(coachingNotes),
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
