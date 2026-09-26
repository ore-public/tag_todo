import { Validations, type App } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { AppStack } from "./appStack";
import { AuthStack } from "./authStack";
import { CertificateStack } from "./certificateStack";
import { readSettings } from "./settings";

export interface TagTodoStacks {
  certificates: CertificateStack;
  auth: AuthStack;
  app: AppStack;
}

/** 全スタックを組み立てる。AWS のセキュリティのベストプラクティスに沿っているかを cdk-nag で検査する */
export function buildApp(app: App, account: string | undefined): TagTodoStacks {
  const settings = readSettings(app);
  const env = { account, region: "ap-northeast-1" };

  const certificates = new CertificateStack(app, "TagTodoCertificates", settings, {
    env: { account, region: "us-east-1" },
    crossRegionReferences: true,
  });
  const auth = new AuthStack(app, "SharedAuth", settings, {
    env,
    crossRegionReferences: true,
    certificate: certificates.authCertificate,
  });
  const appStack = new AppStack(app, "TagTodoApp", settings, {
    env,
    crossRegionReferences: true,
    certificate: certificates.appCertificate,
    userPool: auth.userPool,
    todoClient: auth.todoClient,
    authDomainName: auth.authDomainName,
  });

  Validations.of(app).addPlugins(new AwsSolutionsChecks(app));
  return { certificates, auth, app: appStack };
}
