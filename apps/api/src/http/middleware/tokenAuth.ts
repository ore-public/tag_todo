import { createMiddleware } from "hono/factory";
import { AppError } from "../../usecases/errors";
import { authenticateToken } from "../../usecases/tokens";
import type { AppEnv } from "../env";

/** 外部クライアント（CLI など）の API トークンで利用者を特定する */
export const tokenAuth = createMiddleware<AppEnv>(async (c, next) => {
  const match = /^Bearer (.+)$/.exec(c.req.header("Authorization") ?? "");
  if (!match?.[1]) throw new AppError("unauthorized", "Authorization ヘッダーに API トークンを指定してください");
  c.set("userId", await authenticateToken(c.var.db, match[1]));
  await next();
});
