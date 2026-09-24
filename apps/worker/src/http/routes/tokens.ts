import { apiTokenCreateSchema } from "@tag-todo/shared";
import { Hono } from "hono";
import * as tokens from "../../usecases/tokens";
import type { AppEnv } from "../env";
import { idParamSchema, validate } from "../validation";

export const tokenRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    return c.json(await tokens.listTokens(c.env.DB, c.var.userId));
  })
  .post("/", validate("json", apiTokenCreateSchema), async (c) => {
    return c.json(await tokens.issueToken(c.env.DB, c.var.userId, c.req.valid("json").name), 201);
  })
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    await tokens.revokeToken(c.env.DB, c.var.userId, c.req.valid("param").id);
    return c.body(null, 204);
  });
