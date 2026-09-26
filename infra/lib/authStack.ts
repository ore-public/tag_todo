import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import type { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import type { UserPoolClient } from "aws-cdk-lib/aws-cognito";
import {
  AccountRecovery,
  CfnManagedLoginBranding,
  FeaturePlan,
  ManagedLoginVersion,
  OAuthScope,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolDomain,
} from "aws-cdk-lib/aws-cognito";
import { ARecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";
import { acknowledge } from "./nag";
import { existingHostedZone } from "./hostedZone";
import { appDomain, authDomain, type Settings } from "./settings";

/**
 * 認証基盤（Cognito ユーザープール）。将来の自作アプリとも共有するため、アプリとは別のスタックにする。
 * スタックを削除してもユーザー情報が消えないよう、ユーザープールは削除保護を付けて残す。
 */
export class AuthStack extends Stack {
  readonly userPool: UserPool;
  readonly todoClient: UserPoolClient;
  readonly authDomainName: string;

  constructor(scope: Construct, id: string, settings: Settings, props: StackProps & { certificate: ICertificate }) {
    super(scope, id, props);
    this.authDomainName = authDomain(settings);

    this.userPool = new UserPool(this, "UserPool", {
      userPoolName: "shared-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      featurePlan: FeaturePlan.ESSENTIALS,
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const domain = new UserPoolDomain(this, "Domain", {
      userPool: this.userPool,
      customDomain: { domainName: this.authDomainName, certificate: props.certificate },
      managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });
    new ARecord(this, "DomainRecord", {
      zone: existingHostedZone(this, settings),
      recordName: this.authDomainName,
      // Cognito の独自ドメインの実体は CloudFront なので、その名前を別名として登録する
      target: RecordTarget.fromAlias({
        bind: () => ({ dnsName: domain.cloudFrontEndpoint, hostedZoneId: CloudFrontTarget.CLOUDFRONT_ZONE_ID }),
      }),
    });

    const appOrigin = `https://${appDomain(settings)}`;
    this.todoClient = this.userPool.addClient("TodoClient", {
      userPoolClientName: "tag-todo",
      // ログイン処理は API（Lambda）が行うので、クライアントシークレットを使う
      generateSecret: true,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL],
        callbackUrls: [`${appOrigin}/auth/callback`],
        logoutUrls: [`${appOrigin}/`],
      },
      // API はセッションの有効期限（30日）まで、15分ごとにリフレッシュトークンでユーザーが有効か確認する
      refreshTokenValidity: Duration.days(30),
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
    });

    // 新しいログイン画面（マネージドログイン）の見た目は Cognito の標準のものを使う
    new CfnManagedLoginBranding(this, "Branding", {
      userPoolId: this.userPool.userPoolId,
      clientId: this.todoClient.userPoolClientId,
      useCognitoProvidedValues: true,
    });

    acknowledge(this.userPool, [
      { id: "AwsSolutions-COG2", reason: "個人向けのアプリで、利用者が自分で登録する。多要素認証は必須にしない" },
      { id: "AwsSolutions-COG3", reason: "高度なセキュリティ機能（Plus プラン）は費用がかかるため使わない" },
      { id: "AwsSolutions-COG8", reason: "高度なセキュリティ機能（Plus プラン）は費用がかかるため使わない" },
    ]);
  }
}
