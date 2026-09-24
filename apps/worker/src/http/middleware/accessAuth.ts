import { createMiddleware } from "hono/factory";
import { verifyAccessJwt } from "../../usecases/access";
import { AppError } from "../../usecases/errors";
import { resolveUserByEmail } from "../../usecases/users";
import type { AppEnv } from "../env";

/** 開発モードで、E2E テストなどから利用者を切り替えるためのヘッダー */
const DEV_USER_HEADER = "X-Dev-User-Email";

/** Cloudflare Access を通過したリクエストの利用者を特定する */
export const accessAuth = createMiddleware<AppEnv>(async (c, next) => {
  const env = c.env;
  let email: string;
  if (env.ACCESS_AUD === "" && env.DEV_USER_EMAIL) {
    email = c.req.header(DEV_USER_HEADER) ?? env.DEV_USER_EMAIL;
  } else {
    const token = c.req.header("Cf-Access-Jwt-Assertion");
    if (!token) throw new AppError("unauthorized", "Access の認証情報がありません");
    email = await verifyAccessJwt(token, { teamDomain: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD });
  }
  c.set("userId", await resolveUserByEmail(env.DB, email));
  await next();
});
