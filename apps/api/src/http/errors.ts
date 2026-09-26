import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { logger } from "../logger";
import { AppError, type AppErrorCode } from "../usecases/errors";
import type { AppEnv } from "./env";

const STATUS_BY_CODE = {
  not_found: 404,
  conflict: 409,
  unauthorized: 401,
  forbidden: 403,
} as const satisfies Record<AppErrorCode, ContentfulStatusCode>;

/** ログイン画面でキャンセルしたときなど、/auth/* のエラーは画面として返す */
const AUTH_ERROR_PAGE = `<!doctype html>
<html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ログインできませんでした</title>
<p>ログインできませんでした。</p>
<p><a href="/auth/login">もう一度ログインする</a></p>
</html>`;

export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof AppError) {
    return c.json({ error: { code: error.code, message: error.message } }, STATUS_BY_CODE[error.code]);
  }
  logger.error("リクエストの処理に失敗しました", { path: c.req.path, error });
  if (c.req.path.startsWith("/auth/")) return c.html(AUTH_ERROR_PAGE, 400);
  return c.json({ error: { code: "internal_error", message: "サーバーでエラーが発生しました" } }, 500);
};

export const handleNotFound: NotFoundHandler<AppEnv> = (c) =>
  c.json({ error: { code: "not_found", message: "API が見つかりません" } }, 404);
