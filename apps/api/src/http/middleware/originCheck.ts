import { createMiddleware } from "hono/factory";
import { AppError } from "../../usecases/errors";
import type { AppEnv } from "../env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF 対策。Cookie で認証する API への更新系のリクエストは、自サイトからのものだけ受け付ける。
 * （@hono/oidc-auth の Cookie は SameSite を指定しないため、ここで確認する）
 */
export function originCheck(publicOrigin: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method) && c.req.header("Origin") !== publicOrigin) {
      throw new AppError("forbidden", "このリクエストは受け付けられません");
    }
    await next();
  });
}
