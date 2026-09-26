export interface OidcConfig {
  /** Cognito ユーザープールの発行者 URL（https://cognito-idp.<region>.amazonaws.com/<userPoolId>） */
  issuer: string;
  clientId: string;
  clientSecret: string;
  /** セッション Cookie の署名鍵（32文字以上） */
  sessionSecret: string;
  /** Cognito のログアウトのエンドポイント（https://auth.example.com/logout） */
  logoutEndpoint: string;
}

export interface AppConfig {
  /** 利用者がアクセスする URL のオリジン（https://todo.example.com） */
  publicOrigin: string;
  /** /api/v1/* をブラウザから呼ぶことを許可するオリジン */
  corsOrigins: string[];
  /**
   * Web 画面の認証。
   * oidc: Cognito でログインする（本番）
   * dev: ログインせず、固定のユーザーとして扱う（ローカル開発・E2E テスト）
   */
  auth: { kind: "oidc"; oidc: OidcConfig } | { kind: "dev"; defaultEmail: string };
}
