import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError, type AppErrorCode } from "../usecases/errors";
import type { AppEnv } from "./env";

const STATUS_BY_CODE = {
  not_found: 404,
  conflict: 409,
  unauthorized: 401,
} as const satisfies Record<AppErrorCode, ContentfulStatusCode>;

export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof AppError) {
    return c.json({ error: { code: error.code, message: error.message } }, STATUS_BY_CODE[error.code]);
  }
  console.error(error);
  return c.json({ error: { code: "internal_error", message: "サーバーでエラーが発生しました" } }, 500);
};

export const handleNotFound: NotFoundHandler<AppEnv> = (c) =>
  c.json({ error: { code: "not_found", message: "API が見つかりません" } }, 404);
