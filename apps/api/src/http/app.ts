import { Hono, type MiddlewareHandler } from "hono";
import { except } from "hono/combine";
import { cors } from "hono/cors";
import type { Database } from "../usecases/database";
import type { AppConfig } from "./config";
import type { AppEnv } from "./env";
import { handleError, handleNotFound } from "./errors";
import { devAuth } from "./middleware/devAuth";
import { originCheck } from "./middleware/originCheck";
import { sessionAuth } from "./middleware/sessionAuth";
import { tokenAuth } from "./middleware/tokenAuth";
import { authRoutes, oidcSettings } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { tagRoutes } from "./routes/tags";
import { todoRoutes } from "./routes/todos";
import { tokenRoutes } from "./routes/tokens";

const EXTERNAL_API = "/api/v1";

function webAuth(config: AppConfig): MiddlewareHandler<AppEnv>[] {
  if (config.auth.kind === "dev") return [devAuth(config.auth.defaultEmail)];
  return [oidcSettings(config.publicOrigin, config.auth.oidc), sessionAuth];
}

/**
 * /auth/*   : ログイン・ログアウト
 * /api/*    : Web 画面用。ログインのセッション（Cookie）で認証する
 * /api/v1/* : CLI・外部アプリ用。API トークンで認証する
 */
export function createApp({ db, config }: { db: Database; config: AppConfig }) {
  return new Hono<AppEnv>()
    .use("*", async (c, next) => {
      c.set("db", db);
      await next();
    })
    .use(
      `${EXTERNAL_API}/*`,
      cors({
        origin: (origin) => (config.corsOrigins.includes(origin) ? origin : null),
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      }),
    )
    .use(`${EXTERNAL_API}/*`, tokenAuth)
    .use("/api/*", except(`${EXTERNAL_API}/*`, originCheck(config.publicOrigin), ...webAuth(config)))
    .route("/auth", authRoutes(config))
    .route(`${EXTERNAL_API}/todos`, todoRoutes)
    .route(`${EXTERNAL_API}/tags`, tagRoutes)
    .route("/api/todos", todoRoutes)
    .route("/api/tags", tagRoutes)
    .route("/api/tokens", tokenRoutes)
    .route("/api/me", meRoutes)
    .notFound(handleNotFound)
    .onError(handleError);
}
