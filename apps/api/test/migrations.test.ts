import pg from "pg";
import { describe, expect, it } from "vitest";
import { loadMigrations, migrate, splitStatements, toDsqlStatement, type SqlClient } from "../src/db/migrations";
import { TEST_DATABASE_URL } from "./database";

/** 実行した SQL を記録し、決められた結果を返すクライアント */
function recordingClient(results: Record<string, Record<string, unknown>[]> = {}) {
  const executed: string[] = [];
  const client: SqlClient = {
    query: (sql, params) => {
      executed.push(params ? `${sql} ${JSON.stringify(params)}` : sql);
      const key = Object.keys(results).find((prefix) => sql.startsWith(prefix));
      return Promise.resolve({ rows: key ? (results[key] ?? []) : [] });
    },
  };
  return { client, executed };
}

describe("loadMigrations", () => {
  it("SQL ファイルを番号順に読み込む", async () => {
    const migrations = await loadMigrations(new URL("../migrations", import.meta.url).pathname);
    expect(migrations[0]?.version).toBe("0001_init");
    expect(migrations[0]?.sql).toContain("CREATE TABLE IF NOT EXISTS todos");
  });
});

describe("splitStatements", () => {
  it("コメント行を除き、文ごとに分ける", () => {
    const sql = "-- 説明\nCREATE TABLE a (id int);\n\n-- 説明\nCREATE INDEX a_id ON a (id);\n";
    expect(splitStatements(sql)).toEqual(["CREATE TABLE a (id int)", "CREATE INDEX a_id ON a (id)"]);
  });
});

describe("toDsqlStatement", () => {
  it.each([
    ["CREATE INDEX IF NOT EXISTS a_id ON a (id)", "CREATE INDEX ASYNC IF NOT EXISTS a_id ON a (id)"],
    ["CREATE UNIQUE INDEX a_id ON a (id)", "CREATE UNIQUE INDEX ASYNC a_id ON a (id)"],
    ["CREATE TABLE a (id int)", "CREATE TABLE a (id int)"],
  ])("%s → %s", (input, expected) => {
    expect(toDsqlStatement(input)).toBe(expected);
  });
});

describe("migrate", () => {
  const migrations = [
    { version: "0001_a", sql: "CREATE TABLE a (id int);\nCREATE INDEX a_id ON a (id);" },
    { version: "0002_b", sql: "CREATE TABLE b (id int);" },
  ];

  it("未適用のものだけを番号順に適用し、1文ずつ実行する", async () => {
    const { client, executed } = recordingClient({ "SELECT version": [{ version: "0001_a" }] });

    const applied = await migrate(client, migrations, "postgres");

    expect(applied).toEqual(["0002_b"]);
    expect(executed.slice(2)).toEqual([
      "CREATE TABLE b (id int)",
      'INSERT INTO schema_migrations (version) VALUES ($1) ["0002_b"]',
    ]);
  });

  it("DSQL ではインデックスを非同期で作り、完了を待つ", async () => {
    const { client, executed } = recordingClient({
      "CREATE INDEX ASYNC": [{ job_id: "job-1" }],
      "CALL sys.wait_for_job": [{ succeeded: true }],
    });

    await migrate(client, migrations.slice(0, 1), "dsql");

    expect(executed).toContain("CREATE INDEX ASYNC a_id ON a (id)");
    expect(executed).toContain('CALL sys.wait_for_job($1) ["job-1"]');
  });

  it("DSQL でインデックスの作成に失敗したらエラーにする", async () => {
    const { client } = recordingClient({
      "CREATE INDEX ASYNC": [{ job_id: "job-1" }],
      "CALL sys.wait_for_job": [{ succeeded: false }],
    });

    await expect(migrate(client, migrations.slice(0, 1), "dsql")).rejects.toThrow("インデックスの作成に失敗しました");
  });

  it("適用済みのデータベースにもう一度実行しても、何も適用しない", async () => {
    const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      const { rows } = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
      const all = rows.map((row) => ({ version: row.version, sql: "SELECT 1" }));
      expect(await migrate(client, all, "postgres")).toEqual([]);
    } finally {
      await client.end();
    }
  });
});
