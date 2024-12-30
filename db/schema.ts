import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const selectUserSchema = createSelectSchema(users);

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
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

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { mode: 'string' }).notNull(),
  highlightText: text("highlight_text").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  sentimentScore: integer("sentiment_score"),
  topicAnalysis: jsonb("topic_analysis").$type<string[]>().default([]),
  keyInsights: jsonb("key_insights").$type<string[]>().default([]),
});

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;
export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = typeof summaries.$inferInsert;

export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export const insertSummarySchema = createInsertSchema(summaries);
export const selectSummarySchema = createSelectSchema(summaries);