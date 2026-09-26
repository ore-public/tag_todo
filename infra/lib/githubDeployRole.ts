import { Stack } from "aws-cdk-lib";
import type { Distribution } from "aws-cdk-lib/aws-cloudfront";
import type { CfnCluster } from "aws-cdk-lib/aws-dsql";
import {
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
  type IOpenIdConnectProvider,
} from "aws-cdk-lib/aws-iam";
import type { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { acknowledge } from "./nag";
import type { Settings } from "./settings";

const GITHUB_OIDC_HOST = "token.actions.githubusercontent.com";
/** cdk bootstrap が作るロールの名前の既定の識別子 */
const CDK_QUALIFIER = "hnb659fds";
const CDK_REGIONS = ["ap-northeast-1", "us-east-1"];
const CDK_ROLE_KINDS = ["deploy-role", "file-publishing-role", "image-publishing-role", "lookup-role"];

interface Props {
  settings: Settings;
  cluster: CfnCluster;
  webBucket: Bucket;
  distribution: Distribution;
}

/**
 * GitHub Actions からデプロイするための IAM ロール。
 * アクセスキーを GitHub に置かず、OIDC で一時的な認証情報を受け取る。
 * このリポジトリの production 環境（main へのマージ後のデプロイ）からだけ引き受けられる。
 */
export class GithubDeployRole extends Construct {
  readonly role: Role;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);
    const { account } = Stack.of(this);

    const provider: IOpenIdConnectProvider = props.settings.createGithubOidcProvider
      ? new OpenIdConnectProvider(this, "Provider", {
          url: `https://${GITHUB_OIDC_HOST}`,
          clientIds: ["sts.amazonaws.com"],
        })
      : OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          "Provider",
          `arn:aws:iam::${account}:oidc-provider/${GITHUB_OIDC_HOST}`,
        );

    this.role = new Role(this, "Role", {
      roleName: "tag-todo-github-deploy",
      assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          [`${GITHUB_OIDC_HOST}:aud`]: "sts.amazonaws.com",
          [`${GITHUB_OIDC_HOST}:sub`]: `${props.settings.githubOidcSubjectPrefix}:environment:production`,
        },
      }),
    });

    // cdk deploy は、cdk bootstrap で作られたロールを引き受けて行う
    this.role.addToPolicy(
      new PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: CDK_REGIONS.flatMap((region) =>
          CDK_ROLE_KINDS.map(
            (kind) => `arn:aws:iam::${account}:role/cdk-${CDK_QUALIFIER}-${kind}-${account}-${region}`,
          ),
        ),
      }),
    );
    // マイグレーションの適用（DSQL に admin で接続する）
    this.role.addToPolicy(
      new PolicyStatement({ actions: ["dsql:DbConnectAdmin"], resources: [props.cluster.attrResourceArn] }),
    );
    // SPA の配置（aws s3 sync --delete）とキャッシュの削除
    this.role.addToPolicy(new PolicyStatement({ actions: ["s3:ListBucket"], resources: [props.webBucket.bucketArn] }));
    this.role.addToPolicy(
      new PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [props.webBucket.arnForObjects("*")],
      }),
    );
    this.role.addToPolicy(
      new PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: [`arn:aws:cloudfront::${account}:distribution/${props.distribution.distributionId}`],
      }),
    );

    const bucketLogicalId = Stack.of(this).getLogicalId(props.webBucket.node.defaultChild as never);
    acknowledge(this.role, [
      {
        id: `AwsSolutions-IAM5[Resource::<${bucketLogicalId}.Arn>/*]`,
        reason: "SPA のファイルは毎回すべて入れ替えるため、バケット内の全ファイルを対象にする",
      },
    ]);
  }
}
