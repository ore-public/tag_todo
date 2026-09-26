import type { Construct } from "constructs";

/** cdk.json の context "tagTodo" に書く設定 */
export interface Settings {
  /** Route53 で管理しているドメイン */
  domainName: string;
  /** そのドメインのホストゾーン ID */
  hostedZoneId: string;
  /** アプリの URL は <appSubdomain>.<domainName> */
  appSubdomain: string;
  /** ログイン画面の URL は <authSubdomain>.<domainName> */
  authSubdomain: string;
  /** GitHub のリポジトリ（owner/name）。このリポジトリの CI からだけデプロイできる */
  githubRepository: string;
  /** アカウントに GitHub の OIDC プロバイダーがまだなければ true */
  createGithubOidcProvider: boolean;
}

export function readSettings(scope: Construct): Settings {
  const value = scope.node.tryGetContext("tagTodo") as Partial<Settings> | undefined;
  const required = ["domainName", "hostedZoneId", "appSubdomain", "authSubdomain", "githubRepository"] as const;
  for (const key of required) {
    if (typeof value?.[key] !== "string") throw new Error(`cdk.json の context.tagTodo.${key} を設定してください`);
  }
  return { createGithubOidcProvider: true, ...value } as Settings;
}

export function appDomain(settings: Settings): string {
  return `${settings.appSubdomain}.${settings.domainName}`;
}

export function authDomain(settings: Settings): string {
  return `${settings.authSubdomain}.${settings.domainName}`;
}
