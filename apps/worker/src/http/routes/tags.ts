import { tagUpdateSchema } from "@tag-todo/shared";
import { Hono } from "hono";
import * as tags from "../../usecases/tags";
import type { AppEnv } from "../env";
import { idParamSchema, validate } from "../validation";

export const tagRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    return c.json(await tags.listTags(c.env.DB, c.var.userId));
  })
  .patch("/:id", validate("param", idParamSchema), validate("json", tagUpdateSchema), async (c) => {
    await tags.renameTag(c.env.DB, c.var.userId, c.req.valid("param").id, c.req.valid("json").name);
    return c.body(null, 204);
  })
  .delete("/:id", validate("param", idParamSchema), async (c) => {
    await tags.deleteTag(c.env.DB, c.var.userId, c.req.valid("param").id);
    return c.body(null, 204);
  });
