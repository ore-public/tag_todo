import type { Database } from "../db/connection";
import type { ApiToken, ApiTokenCreated } from "@tag-todo/shared";
import * as repo from "../db/tokenRepository";
import { AppError } from "./errors";

const TOKEN_PREFIX = "tagtodo_";

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  // base64url 形式にする（"=" は末尾の埋め文字にしか現れない）
  const base64url = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return TOKEN_PREFIX + base64url;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function issueToken(db: Database, userId: number, name: string): Promise<ApiTokenCreated> {
  const token = generateToken();
  const saved = await repo.insertToken(db, userId, name, await hashToken(token));
  return { ...saved, token };
}

export function listTokens(db: Database, userId: number): Promise<ApiToken[]> {
  return repo.listActiveTokens(db, userId);
}

export async function revokeToken(db: Database, userId: number, id: number): Promise<void> {
  if (!(await repo.revokeToken(db, userId, id))) {
    throw new AppError("not_found", `トークン ${String(id)} が見つかりません`);
  }
}

/** トークンを検証し、所有ユーザーの id を返す */
export async function authenticateToken(db: Database, token: string): Promise<number> {
  const userId = token.startsWith(TOKEN_PREFIX) ? await repo.useActiveToken(db, await hashToken(token)) : null;
  if (userId === null) throw new AppError("unauthorized", "API トークンが無効です");
  return userId;
}
