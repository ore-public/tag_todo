/**
 * 本番（AWS Lambda）の入口。API Gateway（HTTP API）から呼ばれる。
 * 起動時に Cognito のクライアントシークレットとセッションの署名鍵を取得し、Aurora DSQL に IAM 認証で接続する。
 */
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { createDatabase } from "./db/connection";
import { createApp } from "./http/app";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

const region = requireEnv("AWS_REGION");
const userPoolId = requireEnv("COGNITO_USER_POOL_ID");
const clientId = requireEnv("COGNITO_CLIENT_ID");
const publicOrigin = requireEnv("PUBLIC_ORIGIN");

async function fetchClientSecret(): Promise<string> {
  const { UserPoolClient } = await new CognitoIdentityProviderClient({ region }).send(
    new DescribeUserPoolClientCommand({ UserPoolId: userPoolId, ClientId: clientId }),
  );
  if (!UserPoolClient?.ClientSecret) throw new Error("Cognito のクライアントシークレットを取得できません");
  return UserPoolClient.ClientSecret;
}

async function fetchSessionSecret(): Promise<string> {
  const { SecretString } = await new SecretsManagerClient({ region }).send(
    new GetSecretValueCommand({ SecretId: requireEnv("SESSION_SECRET_ARN") }),
  );
  if (!SecretString) throw new Error("セッションの署名鍵を取得できません");
  return SecretString;
}

const [clientSecret, sessionSecret] = await Promise.all([fetchClientSecret(), fetchSessionSecret()]);

const app = createApp({
  db: createDatabase(new AuroraDSQLPool({ host: requireEnv("DSQL_ENDPOINT"), user: requireEnv("DB_ROLE"), max: 2 })),
  config: {
    publicOrigin,
    corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
    auth: {
      kind: "oidc",
      oidc: {
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        clientId,
        clientSecret,
        sessionSecret,
        logoutEndpoint: `https://${requireEnv("COGNITO_DOMAIN")}/logout`,
      },
    },
  },
});

/**
 * CloudFront 経由のリクエストは、URL のホストが API Gateway のものになっている。
 * ログイン後の戻り先の判定などのため、利用者がアクセスした URL（PUBLIC_ORIGIN）に置き換えてから処理する。
 */
const publicApp = new Hono().all("*", (c) => {
  const url = new URL(c.req.url);
  return app.fetch(new Request(new URL(url.pathname + url.search, publicOrigin), c.req.raw));
});

export const handler = handle(publicApp);
