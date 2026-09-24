import { Hono, type Context } from "hono";
import { except } from "hono/combine";
import { cors } from "hono/cors";
import type { AppEnv } from "./env";
import { handleError, handleNotFound } from "./errors";
import { accessAuth } from "./middleware/accessAuth";
import { tokenAuth } from "./middleware/tokenAuth";
import { meRoutes } from "./routes/me";
import { tagRoutes } from "./routes/tags";
import { todoRoutes } from "./routes/todos";
import { tokenRoutes } from "./routes/tokens";

const EXTERNAL_API = "/api/v1";

/**
 * /api/*    : Web 画面用。Cloudflare Access で認証する
 * /api/v1/* : CLI・外部アプリ用。API トークンで認証する（Access では Bypass に設定する）
 */
export const app = new Hono<AppEnv>()
  .use(
    `${EXTERNAL_API}/*`,
    cors({
      origin: (origin, c: Context<AppEnv>) => (c.env.CORS_ORIGINS.split(",").includes(origin) ? origin : null),
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  )
  .use(`${EXTERNAL_API}/*`, tokenAuth)
  .use("/api/*", except(`${EXTERNAL_API}/*`, accessAuth))
  .route(`${EXTERNAL_API}/todos`, todoRoutes)
  .route(`${EXTERNAL_API}/tags`, tagRoutes)
  .route("/api/todos", todoRoutes)
  .route("/api/tags", tagRoutes)
  .route("/api/tokens", tokenRoutes)
  .route("/api/me", meRoutes)
  .notFound(handleNotFound)
  .onError(handleError);
