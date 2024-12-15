import { pgTable, text, serial, integer, timestamp, date, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
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

export const entryTags = pgTable("entry_tags", {
  entryId: integer("entry_id").references(() => entries.id),
  tagId: integer("tag_id").references(() => tags.id),
}, (t) => ({
  pk: primaryKey(t.entryId, t.tagId),
}));

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: date("date").notNull(),
  highlightText: text("highlight_text").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Relations
// Define relations with proper typing and references
export const entriesRelations = relations(entries, ({ many }) => ({
  entryTags: many(entryTags, {
    fields: [entries.id],
    references: [entryTags.entryId],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(entryTags, {
    fields: [tags.id],
    references: [entryTags.tagId],
  }),
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

// Schemas and Types
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export type SelectTag = typeof tags.$inferSelect;
export type Tag = SelectTag;  // For backwards compatibility
export type NewTag = typeof tags.$inferInsert;

export const insertEntrySchema = createInsertSchema(entries);
export const selectEntrySchema = createSelectSchema(entries);
export type Entry = typeof entries.$inferSelect & {
  entryTags?: {
    tag: SelectTag;
  }[];
};
export type NewEntry = typeof entries.$inferInsert;

export const insertSummarySchema = createInsertSchema(summaries);
export const selectSummarySchema = createSelectSchema(summaries);
export type Summary = typeof summaries.$inferSelect;
export type NewSummary = typeof summaries.$inferInsert;
