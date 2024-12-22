import { pgTable, text, serial, timestamp, integer, boolean, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  hashedPassword: text("hashed_password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: integer("duration"), // in seconds
  transcript: text("transcript"),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Tags table for organizing entries
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    userTagNameUnique: uniqueIndex("user_tag_name_unique").on(table.userId, table.name)
  };
});

// Junction table for journal entries and tags
export const journalEntryTags = pgTable("journal_entry_tags", {
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    pk: uniqueIndex("journal_entry_tags_pk").on(table.journalEntryId, table.tagId)
  };
});

// Sentiment analysis results
export const sentiments = pgTable("sentiments", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id).notNull(),
  score: integer("score").notNull(), // -100 to 100
  analysis: json("analysis").notNull(), // Detailed AI analysis results
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  journalEntries: many(journalEntries),
  tags: many(tags)
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id]
  }),
  tags: many(journalEntryTags),
  sentiment: one(sentiments, {
    fields: [journalEntries.id],
    references: [sentiments.journalEntryId]
  })
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id]
  }),
  journalEntries: many(journalEntryTags)
}));

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const selectJournalEntrySchema = createSelectSchema(journalEntries);

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);

export const insertSentimentSchema = createInsertSchema(sentiments);
export const selectSentimentSchema = createSelectSchema(sentiments);

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Sentiment = typeof sentiments.$inferSelect;
export type NewSentiment = typeof sentiments.$inferInsert;