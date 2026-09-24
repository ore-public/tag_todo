export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Access のログインが切れると、fetch はログイン画面への転送で失敗する */
export class SessionExpiredError extends Error {
  constructor() {
    super("ログインの有効期限が切れました。ページを再読み込みしてください。");
    this.name = "SessionExpiredError";
  }
}
