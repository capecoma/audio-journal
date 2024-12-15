import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow()
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: date("date").notNull(),
  highlightText: text("highlight_text").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export const insertSummarySchema = createInsertSchema(summaries);
export const selectSummarySchema = createSelectSchema(summaries);
export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;
