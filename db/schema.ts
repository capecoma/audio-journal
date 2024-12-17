import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow()
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const entryTags = pgTable("entry_tags", {
  entryId: integer("entry_id").references(() => entries.id),
  tagId: integer("tag_id").references(() => tags.id)
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: date("date").notNull(),
  highlightText: text("highlight_text").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Relations
export const entriesRelations = relations(entries, ({ many }) => ({
  entryTags: many(entryTags)
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(entryTags)
}));

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id],
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id],
  }),
}));

// Create schemas with proper validation
export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

export const insertSummarySchema = createInsertSchema(summaries);
export const selectSummarySchema = createSelectSchema(summaries);
export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;

