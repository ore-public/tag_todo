export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** ログインしていない（セッションの期限が切れた）ときのエラー。ログイン画面へ移動する */
export class SessionExpiredError extends Error {
  constructor() {
    super("ログインが必要です。");
    this.name = "SessionExpiredError";
  }
}

export const LOGIN_PATH = "/auth/login";
export const LOGOUT_PATH = "/auth/logout";
