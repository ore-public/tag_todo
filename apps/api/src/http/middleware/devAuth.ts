import { createMiddleware } from "hono/factory";
import { resolveUser } from "../../usecases/users";
import type { AppEnv } from "../env";

/** E2E テストなどで利用者を切り替えるためのヘッダー */
const DEV_USER_HEADER = "X-Dev-User-Email";

/** 開発モード: ログインせず、ヘッダーか既定のメールアドレスのユーザーとして扱う */
export function devAuth(defaultEmail: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const email = c.req.header(DEV_USER_HEADER) ?? defaultEmail;
    c.set("userId", await resolveUser(c.var.db, { subject: `dev:${email}`, email }));
    await next();
  });
}
