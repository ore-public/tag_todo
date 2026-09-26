import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/** pg.Client / pg.Pool / Aurora DSQL のクライアントに共通する部分 */
export interface SqlClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export type Dialect = "postgres" | "dsql";

export interface Migration {
  version: string;
  sql: string;
}

const CREATE_INDEX = /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i;

export async function loadMigrations(dir: string): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort((a, b) => a.localeCompare(b));
  return Promise.all(
    files.map(async (file) => ({ version: file.replace(/\.sql$/, ""), sql: await readFile(join(dir, file), "utf8") })),
  );
}

/** SQL ファイルを文ごとに分ける。コメント行は除く。文字列の中に ";" を書かないこと */
export function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement !== "");
}

/** DSQL ではインデックスを非同期で作る必要がある */
export function toDsqlStatement(statement: string): string {
  return statement.replace(CREATE_INDEX, (_, unique: string | undefined) => `CREATE ${unique ?? ""}INDEX ASYNC `);
}

async function runStatement(client: SqlClient, statement: string, dialect: Dialect): Promise<void> {
  if (dialect === "postgres" || !CREATE_INDEX.test(statement)) {
    await client.query(statement);
    return;
  }
  // 非同期のインデックス作成が終わるまで待つ。既に存在して作成されなかった場合は job_id が返らない
  const { rows } = await client.query(toDsqlStatement(statement));
  const jobId = rows[0]?.job_id;
  if (typeof jobId !== "string") return;
  // sys.wait_for_job はプロシージャなので CALL で呼ぶ。結果は { succeeded: boolean }
  const { rows: waited } = await client.query("CALL sys.wait_for_job($1)", [jobId]);
  if (waited[0]?.succeeded !== true) throw new Error(`インデックスの作成に失敗しました (job_id: ${jobId})`);
}

/**
 * 未適用のマイグレーションを番号順に適用し、適用したバージョンを返す。
 * DSQL の制約に合わせ、1文ずつ別のトランザクション（自動コミット）で実行する。
 * 途中で失敗して再実行しても問題ないよう、DDL には IF NOT EXISTS を付けること。
 */
export async function migrate(client: SqlClient, migrations: Migration[], dialect: Dialect): Promise<string[]> {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const { rows } = await client.query("SELECT version FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.version));
  const pending = migrations.filter((migration) => !applied.has(migration.version));
  for (const migration of pending) {
    for (const statement of splitStatements(migration.sql)) {
      await runStatement(client, statement, dialect);
    }
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
  }
  return pending.map((migration) => migration.version);
}
