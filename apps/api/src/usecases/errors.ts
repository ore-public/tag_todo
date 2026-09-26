export type AppErrorCode = "not_found" | "conflict" | "unauthorized" | "forbidden";

/** HTTP 層でステータスコードに変換されるアプリケーションのエラー */
export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
