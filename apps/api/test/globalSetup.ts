import pg from "pg";
import { loadMigrations, migrate } from "../src/db/migrations";
import { TEST_DATABASE_URL } from "./database";

const baseUrl = process.env.DATABASE_URL ?? "postgres://tagtodo:tagtodo@localhost:5432/tagtodo";

export default async function setup() {
  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  await admin.query("DROP DATABASE IF EXISTS tagtodo_test");
  await admin.query("CREATE DATABASE tagtodo_test");
  await admin.end();

  const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await migrate(client, await loadMigrations(new URL("../migrations", import.meta.url).pathname), "postgres");
  await client.end();
}
