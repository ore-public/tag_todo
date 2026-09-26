/**
 * ローカル開発・E2E テスト用のサーバー。ローカルの PostgreSQL を使い、ログインは開発モード（固定ユーザー）にする。
 * WEB_DIST を指定すると、ビルドした SPA も配信する（E2E テスト用）。
 */
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import pg from "pg";
import { createDatabase } from "./db/connection";
import { createApp } from "./http/app";

const port = Number(process.env.PORT ?? "8787");
const webDist = process.env.WEB_DIST;

const app = createApp({
  db: createDatabase(
    new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://tagtodo:tagtodo@localhost:5432/tagtodo" }),
  ),
  config: {
    publicOrigin: process.env.PUBLIC_ORIGIN ?? "http://localhost:5173",
    corsOrigins: [],
    auth: { kind: "dev", defaultEmail: process.env.DEV_USER_EMAIL ?? "dev@example.com" },
  },
});

const server = webDist
  ? new Hono()
      .route("/", app)
      .get("*", serveStatic({ root: webDist }))
      // SPA の画面の URL（/tokens など）には index.html を返す
      .get("*", serveStatic({ path: `${webDist}/index.html` }))
  : app;

serve({ fetch: server.fetch, port }, (info) => {
  console.log(`http://localhost:${String(info.port)} で起動しました`);
});
