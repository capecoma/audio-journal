import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Keep existing user table definition
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  preferences: jsonb("preferences").default({ aiJournalingEnabled: false }).notNull(),
  googleId: text("google_id"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry", { mode: 'string' }),
});

// Define progress type for achievements
export const achievementProgressSchema = z.object({
  current: z.number(),
  target: z.number(),
  percent: z.number(),
});

export type AchievementProgress = z.infer<typeof achievementProgressSchema>;

// Achievement table definition
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  criteria: jsonb("criteria").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

// User achievements table with proper progress type
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  earnedAt: timestamp("earned_at", { mode: 'string' }),
  progress: jsonb("progress").$type<AchievementProgress>().default({
    current: 0,
    target: 100,
    percent: 0
  }).notNull(),
});

// Relations definitions
export const usersRelations = relations(users, ({ many }) => ({
  entries: many(entries),
  summaries: many(summaries),
  userAchievements: many(userAchievements)
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements)
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// Keep existing entries and summaries tables
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

export const entriesRelations = relations(entries, ({ one }) => ({
  user: one(users, {
    fields: [entries.userId],
    references: [users.id],
  }),
}));

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date", { mode: 'string' }).notNull(),
  highlightText: text("highlight_text").notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  sentimentScore: integer("sentiment_score"),
  topicAnalysis: jsonb("topic_analysis").$type<string[]>().default([]),
  keyInsights: jsonb("key_insights").$type<string[]>().default([]),
});

export const summariesRelations = relations(summaries, ({ one }) => ({
  user: one(users, {
    fields: [summaries.userId],
    references: [users.id],
  }),
}));

// Export types and schemas
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;
export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = typeof summaries.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;

// Schema validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});
export const selectUserSchema = createSelectSchema(users);
export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export const insertSummarySchema = createInsertSchema(summaries);
export const selectSummarySchema = createSelectSchema(summaries);
export const insertAchievementSchema = createInsertSchema(achievements);
export const selectAchievementSchema = createSelectSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export const selectUserAchievementSchema = createSelectSchema(userAchievements);