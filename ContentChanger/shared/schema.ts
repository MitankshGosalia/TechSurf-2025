import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Smart Replace schemas
export const smartReplaceRequestSchema = z.object({
  findText: z.string().min(1, "Find text is required"),
  replaceText: z.string().min(1, "Replace text is required"),
  originalContent: z.string().min(1, "Original content is required"),
});

export const smartReplaceResponseSchema = z.object({
  processedContent: z.string(),
  statistics: z.object({
    replacements: z.number(),
    links: z.number(),
    emails: z.number(),
    compliance: z.number(),
  }),
});

export type SmartReplaceRequest = z.infer<typeof smartReplaceRequestSchema>;
export type SmartReplaceResponse = z.infer<typeof smartReplaceResponseSchema>;

// Database tables for new features
export const brandkitRules = pgTable("brandkit_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'banned' or 'approved'
  term: text("term").notNull(),
  replacement: text("replacement"), // suggested replacement for banned terms
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const replacementHistory = pgTable("replacement_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalContent: text("original_content").notNull(),
  processedContent: text("processed_content").notNull(),
  operations: json("operations").$type<Array<{findText: string, replaceText: string}>>().notNull(),
  statistics: json("statistics").$type<{replacements: number, links: number, emails: number, compliance: number}>().notNull(),
  isBatch: boolean("is_batch").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const batchOperations = pgTable("batch_operations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  operations: json("operations").$type<Array<{findText: string, replaceText: string, isEnabled: boolean}>>().notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Relations
export const brandkitRulesRelations = relations(brandkitRules, ({ }) => ({}));
export const replacementHistoryRelations = relations(replacementHistory, ({ }) => ({}));
export const batchOperationsRelations = relations(batchOperations, ({ }) => ({}));

// Schemas for new features
export const brandkitRuleSchema = createInsertSchema(brandkitRules).omit({
  id: true,
  createdAt: true,
});

export const replacementHistorySchema = createInsertSchema(replacementHistory).omit({
  id: true,
  createdAt: true,
});

export const batchOperationSchema = createInsertSchema(batchOperations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Extended request schemas for new features
export const batchReplaceRequestSchema = z.object({
  operations: z.array(z.object({
    findText: z.string().min(1, "Find text is required"),
    replaceText: z.string().min(1, "Replace text is required"),
    isEnabled: z.boolean().default(true),
  })).min(1, "At least one operation is required"),
  originalContent: z.string().min(1, "Original content is required"),
  applyBrandkitRules: z.boolean().default(true),
  preserveFormatting: z.boolean().default(true),
});

export const brandkitRuleConfigSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  type: z.enum(["banned", "approved"]),
  term: z.string().min(1, "Term is required"),
  replacement: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Types
export type BrandkitRule = typeof brandkitRules.$inferSelect;
export type InsertBrandkitRule = z.infer<typeof brandkitRuleSchema>;
export type ReplacementHistory = typeof replacementHistory.$inferSelect;
export type InsertReplacementHistory = z.infer<typeof replacementHistorySchema>;
export type BatchOperation = typeof batchOperations.$inferSelect;
export type InsertBatchOperation = z.infer<typeof batchOperationSchema>;
export type BatchReplaceRequest = z.infer<typeof batchReplaceRequestSchema>;
export type BrandkitRuleConfig = z.infer<typeof brandkitRuleConfigSchema>;
