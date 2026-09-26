import { Validations } from "aws-cdk-lib";
import type { IConstruct } from "constructs";

/** cdk-nag の指摘を、理由を付けて許容する（scope の配下すべてに適用される） */
export function acknowledge(scope: IConstruct, findings: { id: string; reason: string }[]) {
  for (const finding of findings) Validations.of(scope).acknowledge(finding);
}
