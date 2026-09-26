import type { Transaction } from "kysely";
import type { Database } from "./connection";
import type { DB } from "./schema";

const MAX_ATTEMPTS = 4;

/** DSQL の楽観的同時実行制御で、同時更新が衝突したときのエラー */
function isConflictError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return code === "40001" || (typeof message === "string" && /\bOC00[01]\b/.test(message));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** トランザクションを実行する。同時更新が衝突したら、少し待ってやり直す */
export async function withTransaction<T>(db: Database, fn: (trx: Transaction<DB>) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction().execute(fn);
    } catch (error) {
      if (!isConflictError(error) || attempt >= MAX_ATTEMPTS) throw error;
      // 同時にやり直して再び衝突しないよう、待ち時間を少しずらす（暗号用途ではない）
      // eslint-disable-next-line sonarjs/pseudo-random
      await sleep(2 ** attempt * 25 + Math.random() * 25);
    }
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}
