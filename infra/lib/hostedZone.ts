import { HostedZone, type IHostedZone } from "aws-cdk-lib/aws-route53";
import type { Construct } from "constructs";
import type { Settings } from "./settings";

/** 既存のホストゾーン（Route53）。synth のときに AWS へ問い合わせないよう、ID を直接指定する */
export function existingHostedZone(scope: Construct, settings: Settings): IHostedZone {
  return HostedZone.fromHostedZoneAttributes(scope, "HostedZone", {
    hostedZoneId: settings.hostedZoneId,
    zoneName: settings.domainName,
  });
}
