import pg from "pg";
import { createDatabase } from "../src/db/connection";

const url = new URL(process.env.DATABASE_URL ?? "postgres://tagtodo:tagtodo@localhost:5432/tagtodo");
url.pathname = "/tagtodo_test";
export const TEST_DATABASE_URL = url.href;

/** テスト用データベースへの接続（テストファイルごとに1つ） */
export const testDb = createDatabase(new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 4 }));
