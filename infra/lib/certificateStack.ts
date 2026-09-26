import { Stack, type StackProps } from "aws-cdk-lib";
import { Certificate, CertificateValidation, type ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import type { Construct } from "constructs";
import { existingHostedZone } from "./hostedZone";
import { appDomain, authDomain, type Settings } from "./settings";

/**
 * CloudFront と Cognito の独自ドメインに使う証明書。どちらも us-east-1 に置く必要がある。
 */
export class CertificateStack extends Stack {
  readonly appCertificate: ICertificate;
  readonly authCertificate: ICertificate;

  constructor(scope: Construct, id: string, settings: Settings, props: StackProps) {
    super(scope, id, props);
    const hostedZone = existingHostedZone(this, settings);
    this.appCertificate = new Certificate(this, "AppCertificate", {
      domainName: appDomain(settings),
      validation: CertificateValidation.fromDns(hostedZone),
    });
    this.authCertificate = new Certificate(this, "AuthCertificate", {
      domainName: authDomain(settings),
      validation: CertificateValidation.fromDns(hostedZone),
    });
  }
}
