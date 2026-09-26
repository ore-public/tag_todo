import { todoCreateSchema, todoListQuerySchema, todoUpdateSchema } from "@tag-todo/shared";
import { Hono } from "hono";
import * as todos from "../../usecases/todos";
import type { AppEnv } from "../env";
import { idParamSchema, validate } from "../validation";

export const todoRoutes = new Hono<AppEnv>()
  .get("/", validate("query", todoListQuerySchema), async (c) => {
    return c.json(await todos.listTodos(c.var.db, c.var.userId, c.req.valid("query")));
  })
  .post("/", validate("json", todoCreateSchema), async (c) => {
    return c.json(await todos.createTodo(c.var.db, c.var.userId, c.req.valid("json")), 201);
  })
  .get("/:id", validate("param", idParamSchema), async (c) => {
    return c.json(await todos.getTodo(c.var.db, c.var.userId, c.req.valid("param").id));
  })
  .patch("/:id", validate("param", idParamSchema), validate("json", todoUpdateSchema), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await todos.updateTodo(c.var.db, c.var.userId, id, c.req.valid("json")));
  })
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    await todos.deleteTodo(c.var.db, c.var.userId, c.req.valid("param").id);
    return c.body(null, 204);
  });
