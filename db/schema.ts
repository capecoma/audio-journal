import { pgTable, text, serial, integer, timestamp, date, primaryKey, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => ({
  nameUserIdx: unique("tags_name_user_idx").on(t.name, t.userId)
}));

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const entryTags = pgTable("entry_tags", {
  entryId: integer("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
}, (t) => ({
  pk: primaryKey({ columns: [t.entryId, t.tagId] }),
  uniq: unique("entry_tags_entry_tag_idx").on(t.entryId, t.tagId)
}));

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  highlightText: text("highlight_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (t) => ({
  dateUserIdx: unique("summaries_date_user_idx").on(t.date, t.userId)
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tags: many(tags),
  entries: many(entries),
  summaries: many(summaries)
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id]
  }),
  entryTags: many(entryTags)
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  user: one(users, {
    fields: [entries.userId],
    references: [users.id]
  }),
  entryTags: many(entryTags)
}));

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
  entry: one(entries, {
    fields: [entryTags.entryId],
    references: [entries.id]
  }),
  tag: one(tags, {
    fields: [entryTags.tagId],
    references: [tags.id]
  })
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  user: one(users, {
    fields: [summaries.userId],
    references: [users.id]
  })
}));

// Schemas and Types
export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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