import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Basic user preferences type
export const userPreferencesSchema = z.object({
  aiJournalingEnabled: z.boolean().default(false)
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  preferences: jsonb("preferences").$type<UserPreferences>().default({ aiJournalingEnabled: false }).notNull(),
});

// Export types and schemas for auth
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SelectUser = User; // For compatibility with auth module

// Schema validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});
export const selectUserSchema = createSelectSchema(users);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  entries: many(entries),
  summaries: many(summaries)
}));

// Entries table
export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),
  duration: integer("duration"),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  aiAnalysis: jsonb("ai_analysis").$type<{
    sentiment?: number;
    topics?: string[];
    insights?: string[];
  }>().default({}),
});

// Summaries table
export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date", { mode: 'string' }).notNull(),
  highlightText: text("highlight_text").notNull(),
  sentimentScore: integer("sentiment_score"),
  topicAnalysis: jsonb("topic_analysis").$type<string[]>().default([]),
  keyInsights: jsonb("key_insights").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// Relations for entries and summaries
export const entriesRelations = relations(entries, ({ one }) => ({
  user: one(users, {
    fields: [entries.userId],
    references: [users.id],
  }),
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  user: one(users, {
    fields: [summaries.userId],
    references: [users.id],
  }),
}));

// Export types for entries and summaries
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;

// Schema validation for entries and summaries
export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export const insertSummarySchema = createInsertSchema(summaries);
export const selectSummarySchema = createSelectSchema(summaries);