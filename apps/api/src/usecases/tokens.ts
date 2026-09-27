import type { Database } from "../db/connection";
import type { ApiToken, ApiTokenCreated } from "@tag-todo/shared";
import * as repo from "../db/tokenRepository";
import type { TokenTable } from "../db/tokenRepository";
import { AppError } from "./errors";

/** トークンの種類ごとの保存先と、平文のトークンの先頭に付ける文字列 */
export interface TokenKind {
  table: TokenTable;
  prefix: string;
}

/** CLI・外部アプリ用。todo の読み書きができる */
export const API_TOKEN: TokenKind = { table: "api_tokens", prefix: "tagtodo_" };

/** カレンダーアプリに登録する iCal フィードの URL に含める。todo を読むことだけに使う */
export const CALENDAR_FEED_TOKEN: TokenKind = { table: "calendar_feeds", prefix: "tagtodocal_" };

function generateToken(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  // base64url 形式にする（"=" は末尾の埋め文字にしか現れない）
  const base64url = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return prefix + base64url;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function issueToken(
  db: Database,
  kind: TokenKind,
  userId: number,
  name: string,
): Promise<ApiTokenCreated> {
  const token = generateToken(kind.prefix);
  const saved = await repo.insertToken(db, kind.table, userId, { name, tokenHash: await hashToken(token) });
  return { ...saved, token };
}

export function listTokens(db: Database, kind: TokenKind, userId: number): Promise<ApiToken[]> {
  return repo.listActiveTokens(db, kind.table, userId);
}

export async function revokeToken(db: Database, kind: TokenKind, userId: number, id: number): Promise<void> {
  if (!(await repo.revokeToken(db, kind.table, userId, id))) {
    throw new AppError("not_found", `トークン ${String(id)} が見つかりません`);
  }
}

/** 有効なトークンなら所有ユーザーの id を返し、最終利用日時を更新する。無効なら null を返す */
export async function findTokenOwner(db: Database, kind: TokenKind, token: string): Promise<number | null> {
  if (!token.startsWith(kind.prefix)) return null;
  return repo.useActiveToken(db, kind.table, await hashToken(token));
}

/** API トークンを検証し、所有ユーザーの id を返す */
export async function authenticateToken(db: Database, token: string): Promise<number> {
  const userId = await findTokenOwner(db, API_TOKEN, token);
  if (userId === null) throw new AppError("unauthorized", "API トークンが無効です");
  return userId;
}
