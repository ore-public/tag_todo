import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { HttpApi, LogGroupLogDestination, type ThrottleSettings } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import type { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
  type BehaviorOptions,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import type { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { CfnCluster } from "aws-cdk-lib/aws-dsql";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ARecord, AaaaRecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import { acknowledge } from "./nag";
import { fileURLToPath } from "node:url";
import { GithubDeployRole } from "./githubDeployRole";
import { existingHostedZone } from "./hostedZone";
import { appDomain, type Settings } from "./settings";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
/** アプリ用の DB ロール名（apps/api/scripts/migrate.ts で作成する） */
const DB_ROLE = "tagtodo_app";

interface AppStackProps extends StackProps {
  certificate: ICertificate;
  userPool: UserPool;
  todoClient: UserPoolClient;
  authDomainName: string;
}

/** SPA の画面の URL（/tokens など、拡張子のないパス）は index.html を返す */
const SPA_REWRITE = `
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf(".") === -1) request.uri = "/index.html";
  return request;
}`;

export class AppStack extends Stack {
  readonly cluster: CfnCluster;
  readonly webBucket: Bucket;
  readonly distribution: Distribution;
  readonly apiFunction: NodejsFunction;

  constructor(scope: Construct, id: string, settings: Settings, props: AppStackProps) {
    super(scope, id, props);
    const domainName = appDomain(settings);

    this.cluster = new CfnCluster(this, "Database", { deletionProtectionEnabled: true });
    this.cluster.applyRemovalPolicy(RemovalPolicy.RETAIN);
    const dsqlEndpoint = `${this.cluster.attrIdentifier}.dsql.${this.region}.on.aws`;

    const sessionSecret = new Secret(this, "SessionSecret", {
      description: "tag_todo のログインのセッション Cookie の署名鍵",
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
    });

    this.apiFunction = this.createApiFunction({ domainName, dsqlEndpoint, sessionSecret, ...props });
    const httpApi = this.createHttpApi();

    this.webBucket = new Bucket(this, "WebBucket", {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      // デプロイのたびに SPA のファイルをすべて入れ替えるので、古い版は残さない（元のファイルはリポジトリにある）
      // eslint-disable-next-line sonarjs/aws-s3-bucket-versioning
      versioned: false,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
    });

    this.distribution = this.createDistribution({ domainName, httpApi, certificate: props.certificate });
    const zone = existingHostedZone(this, settings);
    const target = RecordTarget.fromAlias(new CloudFrontTarget(this.distribution));
    new ARecord(this, "AppRecord", { zone, recordName: domainName, target });
    new AaaaRecord(this, "AppRecordIpv6", { zone, recordName: domainName, target });

    const deployRole = new GithubDeployRole(this, "GithubDeploy", {
      settings,
      cluster: this.cluster,
      webBucket: this.webBucket,
      distribution: this.distribution,
    });

    // CI（デプロイ後のマイグレーション、SPA の配置）で使う値
    new CfnOutput(this, "GithubDeployRoleArn", { value: deployRole.role.roleArn });
    new CfnOutput(this, "DsqlEndpoint", { value: dsqlEndpoint });
    new CfnOutput(this, "ApiRoleArn", { value: this.apiFunction.role?.roleArn ?? "" });
    new CfnOutput(this, "WebBucketName", { value: this.webBucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: this.distribution.distributionId });

    this.suppressNagFindings(sessionSecret);
  }

  private createApiFunction(
    props: AppStackProps & { domainName: string; dsqlEndpoint: string; sessionSecret: Secret },
  ) {
    const fn = new NodejsFunction(this, "ApiFunction", {
      entry: `${REPO_ROOT}apps/api/src/lambda.ts`,
      projectRoot: REPO_ROOT,
      depsLockFilePath: `${REPO_ROOT}pnpm-lock.yaml`,
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.ARM_64,
      memorySize: 512,
      timeout: Duration.seconds(15),
      logGroup: new LogGroup(this, "ApiLogs", { retention: RetentionDays.ONE_MONTH }),
      environment: {
        PUBLIC_ORIGIN: `https://${props.domainName}`,
        DSQL_ENDPOINT: props.dsqlEndpoint,
        DB_ROLE,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.todoClient.userPoolClientId,
        COGNITO_DOMAIN: props.authDomainName,
        SESSION_SECRET_ARN: props.sessionSecret.secretArn,
        CORS_ORIGINS: "",
        // エラーのスタックトレースを元のソースの位置で表示する
        NODE_OPTIONS: "--enable-source-maps",
      },
      bundling: {
        format: OutputFormat.ESM,
        minify: true,
        sourceMap: true,
        target: "node24",
        // pg などの CommonJS のパッケージが require を使えるようにする
        banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
        externalModules: ["pg-native"],
      },
    });
    fn.addToRolePolicy(new PolicyStatement({ actions: ["dsql:DbConnect"], resources: [this.cluster.attrResourceArn] }));
    fn.addToRolePolicy(
      new PolicyStatement({ actions: ["cognito-idp:DescribeUserPoolClient"], resources: [props.userPool.userPoolArn] }),
    );
    props.sessionSecret.grantRead(fn);
    return fn;
  }

  private createHttpApi(): HttpApi {
    const accessLogs = new LogGroup(this, "ApiAccessLogs", { retention: RetentionDays.ONE_MONTH });
    const httpApi = new HttpApi(this, "HttpApi", {
      defaultIntegration: new HttpLambdaIntegration("ApiIntegration", this.apiFunction),
      createDefaultStage: false,
    });
    // 大量アクセスへの対策として、1秒あたりのリクエスト数を制限する
    const throttle: ThrottleSettings = { rateLimit: 20, burstLimit: 40 };
    httpApi.addStage("DefaultStage", {
      autoDeploy: true,
      throttle,
      stageName: "$default",
      accessLogSettings: { destination: new LogGroupLogDestination(accessLogs) },
    });
    acknowledge(httpApi, [
      { id: "AwsSolutions-APIG4", reason: "認証は API（Lambda）の中で行う（Cookie のセッションと API トークン）" },
    ]);
    return httpApi;
  }

  private createDistribution(props: { domainName: string; httpApi: HttpApi; certificate: ICertificate }) {
    // API はキャッシュせず、Cookie やクエリをそのまま渡す（Host は API Gateway のものにする）
    const apiBehavior: BehaviorOptions = {
      origin: new HttpOrigin(Fn.select(2, Fn.split("/", props.httpApi.apiEndpoint))),
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    return new Distribution(this, "Distribution", {
      domainNames: [props.domainName],
      certificate: props.certificate,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.webBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [
          {
            eventType: FunctionEventType.VIEWER_REQUEST,
            function: new CloudFrontFunction(this, "SpaRewrite", { code: FunctionCode.fromInline(SPA_REWRITE) }),
          },
        ],
      },
      additionalBehaviors: { "/api/*": apiBehavior, "/auth/*": apiBehavior, "/ical/*": apiBehavior },
    });
  }

  private suppressNagFindings(sessionSecret: Secret) {
    acknowledge(sessionSecret, [
      { id: "AwsSolutions-SMG4", reason: "署名鍵を変えると全員がログアウトされるため、自動では変更しない" },
    ]);
    acknowledge(this.webBucket, [
      { id: "AwsSolutions-S1", reason: "SPA の静的ファイルだけを置くバケットで、アクセスログは不要" },
    ]);
    acknowledge(this.distribution, [
      { id: "AwsSolutions-CFR1", reason: "利用者の地域は制限しない" },
      { id: "AwsSolutions-CFR2", reason: "個人向けのアプリで、WAF の費用に見合わない。API Gateway で流量を制限する" },
      { id: "AwsSolutions-CFR3", reason: "アクセスの記録は API Gateway のアクセスログで足りる" },
    ]);
    acknowledge(this.apiFunction, [
      {
        id: "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]",
        reason: "Lambda の基本的な実行ロール（CloudWatch Logs への書き込み）は AWS 管理ポリシーを使う",
      },
    ]);
  }
}
