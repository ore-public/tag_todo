/**
 * マイグレーションを適用する。
 * - ローカル: DATABASE_URL の PostgreSQL に適用する
 * - 本番: DSQL_ENDPOINT の Aurora DSQL に admin で接続して適用し、APP_ROLE_ARN の IAM ロールにテーブルの読み書きを許可する
 */
import { AuroraDSQLClient } from "@aws/aurora-dsql-node-postgres-connector";
import pg from "pg";
import { grantAppRole } from "../src/db/grants";
import { loadMigrations, migrate } from "../src/db/migrations";

const MIGRATIONS_DIR = new URL("../migrations", import.meta.url).pathname;
const LOCAL_DATABASE_URL = "postgres://tagtodo:tagtodo@localhost:5432/tagtodo";

async function main() {
  const migrations = await loadMigrations(MIGRATIONS_DIR);
  const dsqlEndpoint = process.env.DSQL_ENDPOINT;
  if (dsqlEndpoint) {
    const client = new AuroraDSQLClient({ host: dsqlEndpoint, user: "admin" });
    await client.connect();
    try {
      console.log("適用しました:", await migrate(client, migrations, "dsql"));
      const appRoleArn = process.env.APP_ROLE_ARN;
      if (appRoleArn) await grantAppRole(client, "tagtodo_app", appRoleArn);
    } finally {
      await client.end();
    }
    return;
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL });
  await client.connect();
  try {
    console.log("適用しました:", await migrate(client, migrations, "postgres"));
  } finally {
    await client.end();
  }
}

await main();
