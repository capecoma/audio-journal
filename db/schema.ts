import { pgTable, text, serial, integer, timestamp, jsonb, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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