import { apiTokenCreateSchema } from "@tag-todo/shared";
import { Hono } from "hono";
import * as tokens from "../../usecases/tokens";
import type { TokenKind } from "../../usecases/tokens";
import type { AppEnv } from "../env";
import { idParamSchema, validate } from "../validation";

/** トークンの発行・一覧・失効。API トークンとカレンダーのフィード用トークンで共通 */
export function tokenRoutes(kind: TokenKind) {
  return new Hono<AppEnv>()
    .get("/", async (c) => {
      return c.json(await tokens.listTokens(c.var.db, kind, c.var.userId));
    })
    .post("/", validate("json", apiTokenCreateSchema), async (c) => {
      return c.json(await tokens.issueToken(c.var.db, kind, c.var.userId, c.req.valid("json").name), 201);
    })
    .delete("/:id", validate("param", idParamSchema), async (c) => {
      await tokens.revokeToken(c.var.db, kind, c.var.userId, c.req.valid("param").id);
      return c.body(null, 204);
    });
}
