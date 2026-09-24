export interface AppEnv {
  Bindings: Env & {
    /** ローカル開発・テスト用。ACCESS_AUD が空のときだけ有効 */
    DEV_USER_EMAIL?: string;
  };
  Variables: {
    userId: number;
  };
}
