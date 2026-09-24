import { z } from "zod";
import { isValidDate } from "./date";

export const dateSchema = z.string().refine(isValidDate, "YYYY-MM-DD 形式の日付を指定してください");

const tagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((name) => !/[\s,]/.test(name), "タグ名に空白とカンマは使えません");

const tagsSchema = z
  .array(tagNameSchema)
  .max(20)
  .transform((tags) => [...new Set(tags)]);

export const todoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  note: z.string(),
  done: z.boolean(),
  doDate: dateSchema.nullable(),
  dueDate: dateSchema.nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type Todo = z.infer<typeof todoSchema>;

export const todoCreateSchema = z.object({
  title: z.string().trim().min(1).max(500),
  note: z.string().max(10000).optional(),
  doDate: dateSchema.nullable().optional(),
  dueDate: dateSchema.nullable().optional(),
  tags: tagsSchema.optional(),
});
export type TodoCreate = z.input<typeof todoCreateSchema>;

export const todoUpdateSchema = todoCreateSchema.partial().extend({
  done: z.boolean().optional(),
});
export type TodoUpdate = z.input<typeof todoUpdateSchema>;

export const todoStatusSchema = z.enum(["open", "done", "all"]);
export type TodoStatus = z.infer<typeof todoStatusSchema>;

export const todoListQuerySchema = z.object({
  status: todoStatusSchema.default("open"),
  tag: tagNameSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});
export type TodoListQuery = z.input<typeof todoListQuerySchema>;

export const tagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  openCount: z.number().int(),
});
export type Tag = z.infer<typeof tagSchema>;

export const tagUpdateSchema = z.object({
  name: tagNameSchema,
});
export type TagUpdate = z.input<typeof tagUpdateSchema>;

export const apiTokenSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});
export type ApiToken = z.infer<typeof apiTokenSchema>;

export const apiTokenCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export type ApiTokenCreate = z.input<typeof apiTokenCreateSchema>;

/** 発行直後だけ平文のトークンを含む */
export const apiTokenCreatedSchema = apiTokenSchema.extend({
  token: z.string(),
});
export type ApiTokenCreated = z.infer<typeof apiTokenCreatedSchema>;

export const meSchema = z.object({
  email: z.string(),
});
export type Me = z.infer<typeof meSchema>;

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
