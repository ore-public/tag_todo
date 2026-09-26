import { App } from "aws-cdk-lib";
import { buildApp } from "../lib/app";

// AWS の認証情報がない環境（CI の静的チェック）でも synth できるよう、アカウントが分からなければ仮の値を使う
buildApp(new App(), process.env.CDK_DEFAULT_ACCOUNT ?? "000000000000");
