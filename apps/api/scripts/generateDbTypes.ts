/**
 * マイグレーションを適用した一時的なデータベースから、Kysely 用の型定義（src/db/schema.ts）を生成する。
 * --check を付けると、生成結果が今のファイルと一致するかだけを確認する（CI 用）。
 */
import { execFileSync } from "node:child_process";
import pg from "pg";
import { loadMigrations, migrate } from "../src/db/migrations";

const baseUrl = new URL(process.env.DATABASE_URL ?? "postgres://tagtodo:tagtodo@localhost:5432/tagtodo");
const TEMP_DB = "tagtodo_codegen";

async function withAdmin(fn: (client: pg.Client) => Promise<void>) {
  const client = new pg.Client({ connectionString: baseUrl.href });
  await client.connect();
  try {
    await fn(client);
  } finally {
    await client.end();
  }
}

await withAdmin((client) => client.query(`DROP DATABASE IF EXISTS ${TEMP_DB}`).then(() => undefined));
await withAdmin((client) => client.query(`CREATE DATABASE ${TEMP_DB}`).then(() => undefined));
const tempUrl = new URL(baseUrl);
tempUrl.pathname = `/${TEMP_DB}`;
try {
  const client = new pg.Client({ connectionString: tempUrl.href });
  await client.connect();
  await migrate(client, await loadMigrations(new URL("../migrations", import.meta.url).pathname), "postgres");
  await client.end();

  execFileSync(
    new URL("../node_modules/.bin/kysely-codegen", import.meta.url).pathname,
    [
      "--dialect",
      "postgres",
      "--url",
      tempUrl.href,
      "--out-file",
      "src/db/schema.ts",
      "--exclude-pattern",
      "schema_migrations",
      "--date-parser",
      "string",
      // connection.ts の型変換に合わせる
      "--type-mapping",
      JSON.stringify({ int8: "number", timestamptz: "string" }),
      ...(process.argv.includes("--check") ? ["--verify"] : []),
    ],
    { stdio: "inherit" },
  );
} finally {
  await withAdmin((client) => client.query(`DROP DATABASE IF EXISTS ${TEMP_DB}`).then(() => undefined));
}
