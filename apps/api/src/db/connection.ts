import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { DB } from "./schema";

// API の型（shared のスキーマ）に合わせて、DB の値を変換する
// bigint の id は number に（件数や id が 2^53 を超えることはない）
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
// date は "YYYY-MM-DD" のまま（Date にするとタイムゾーンの影響を受ける）
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// timestamptz は ISO 8601 形式の文字列に
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value) => new Date(value).toISOString());

export type Database = Kysely<DB>;

export function createDatabase(pool: pg.Pool): Database {
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
}
