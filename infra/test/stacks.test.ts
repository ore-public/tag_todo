import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { buildApp } from "../lib/app";

const settings = {
  domainName: "example.com",
  hostedZoneId: "Z123",
  appSubdomain: "todo",
  authSubdomain: "auth",
  githubOidcSubjectPrefix: "repo:owner@1/repo@2",
  createGithubOidcProvider: true,
};

function synth(overrides: Partial<typeof settings> = {}) {
  // Lambda のコードのバンドルは時間がかかるので省く
  const app = new App({ context: { tagTodo: { ...settings, ...overrides }, "aws:cdk:bundling-stacks": [] } });
  const stacks = buildApp(app, "123456789012");
  return {
    app,
    auth: Template.fromStack(stacks.auth),
    main: Template.fromStack(stacks.app),
  };
}

describe("cdk-nag", () => {
  it("AWS のセキュリティのベストプラクティスの検査で指摘がない", () => {
    const { app } = synth();
    expect(() => app.synth()).not.toThrow();
  });
});

describe("認証基盤", () => {
  const { auth } = synth();

  it("誰でも登録でき、メールアドレスの確認が必要。削除保護がある", () => {
    auth.hasResourceProperties("AWS::Cognito::UserPool", {
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: false },
      AutoVerifiedAttributes: ["email"],
      DeletionProtection: "ACTIVE",
    });
    auth.hasResource("AWS::Cognito::UserPool", { DeletionPolicy: "Retain" });
  });

  it("アプリのクライアントは認可コードフローで、戻り先はアプリのドメインだけ", () => {
    auth.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: true,
      AllowedOAuthFlows: ["code"],
      AllowedOAuthScopes: ["openid", "email"],
      CallbackURLs: ["https://todo.example.com/auth/callback"],
      LogoutURLs: ["https://todo.example.com/"],
    });
  });

  it("ログイン画面は独自ドメイン", () => {
    auth.hasResourceProperties("AWS::Cognito::UserPoolDomain", { Domain: "auth.example.com" });
  });
});

describe("アプリ", () => {
  const { main } = synth();

  it("DSQL のクラスターには削除保護があり、スタックを削除しても残る", () => {
    main.hasResource("AWS::DSQL::Cluster", {
      Properties: { DeletionProtectionEnabled: true },
      DeletionPolicy: "Retain",
    });
  });

  it("API の Lambda に、公開 URL と DB ロールを渡す", () => {
    main.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs24.x",
      Architectures: ["arm64"],
      Environment: {
        Variables: Match.objectLike({ PUBLIC_ORIGIN: "https://todo.example.com", DB_ROLE: "tagtodo_app" }),
      },
    });
  });

  it("API（/api/*・/auth/*・/ical/*）はキャッシュせず、Cookie などをそのまま API Gateway に渡す", () => {
    const cachingDisabled = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad";
    const allViewerExceptHost = "b689b0a8-53d0-40ab-baf2-68738e2966ac";
    main.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: ["todo.example.com"],
        CacheBehaviors: ["/api/*", "/auth/*", "/ical/*"].map((pathPattern) =>
          Match.objectLike({
            PathPattern: pathPattern,
            CachePolicyId: cachingDisabled,
            OriginRequestPolicyId: allViewerExceptHost,
            AllowedMethods: Match.arrayWith(["PATCH", "POST", "DELETE"]),
          }),
        ),
      }),
    });
  });

  it("API Gateway でリクエスト数を制限する", () => {
    main.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
      DefaultRouteSettings: { ThrottlingRateLimit: 20, ThrottlingBurstLimit: 40 },
    });
  });

  it("SPA のバケットは公開しない", () => {
    main.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });
});

describe("GitHub Actions 用のデプロイロール", () => {
  it("このリポジトリの production 環境からだけ引き受けられる", () => {
    const { main } = synth();
    main.hasResourceProperties("AWS::IAM::Role", {
      RoleName: "tag-todo-github-deploy",
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: {
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                "token.actions.githubusercontent.com:sub": "repo:owner@1/repo@2:environment:production",
              },
            },
          }),
        ],
      },
    });
  });

  it("OIDC プロバイダーが既にあるアカウントでは作らない", () => {
    const { main } = synth({ createGithubOidcProvider: false });
    main.resourceCountIs("Custom::AWSCDKOpenIdConnectProvider", 0);
  });
});

describe("設定", () => {
  it("必須の設定がなければエラーにする", () => {
    const app = new App({ context: { tagTodo: { ...settings, hostedZoneId: undefined } } });
    expect(() => buildApp(app, "123456789012")).toThrow("context.tagTodo.hostedZoneId");
  });
});
