# tag_todo

タグ・実施日・期限を設定できる todo アプリ。画面はキーボードだけで操作できる。

- Web（SPA）：React + Vite。スマホからも使える（ブラウザのショートカットをホーム画面に置く）
- API：Hono を AWS Lambda で動かす。DB は Aurora DSQL
- ログイン：Amazon Cognito（誰でも自分で登録できる）
- CLI：`tagtodo`。AI エージェントからの利用を想定し、全コマンドで JSON を出力できる
- インフラ：AWS CDK（TypeScript）

## 構成

```
ブラウザ ──https://todo.office-ore.net──▶ CloudFront ─┬─ /*              → S3（SPA）
CLI     ──Bearer トークン─────────────────▶            └─ /api/* /auth/*  → API Gateway → Lambda（Hono）→ Aurora DSQL
ログイン画面 https://auth.office-ore.net（Cognito）
```

| パス              | 内容                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/shared` | API の型定義・入力チェック・日付処理（web / api / cli で共有）                                       |
| `apps/api`        | API。Lambda 用の入口（`src/lambda.ts`）と、ローカル開発・E2E テスト用の入口（`src/server.ts`）がある |
| `apps/web`        | SPA                                                                                                  |
| `packages/cli`    | CLI（npm に `tagtodo` として公開する）                                                               |
| `infra`           | CDK のスタック定義                                                                                   |
| `e2e`             | E2E テスト（Playwright）                                                                             |

### 認証

- `/auth/*`：ログイン・ログアウト。`@hono/oidc-auth` が Cognito とのやりとりと、セッションの Cookie を扱う
- `/api/*`：Web 画面用。セッションの Cookie で認証する。未ログインなら 401 を返し、SPA がログイン画面へ移動する
- `/api/v1/*`：CLI・外部アプリ用。Web 画面で発行した API トークンで認証する（`Authorization: Bearer <トークン>`）

### DB

- マイグレーションは `apps/api/migrations/*.sql`。Aurora DSQL と PostgreSQL の両方で動く SQL だけを使う
- DB アクセスは Kysely。型定義（`apps/api/src/db/schema.ts`）は `pnpm --filter @tag-todo/api db:types` で自動生成する。マイグレーションを追加したら実行する
- ローカルと CI では、Aurora DSQL の代わりに PostgreSQL（docker compose）を使う

## 開発

```sh
pnpm install
pnpm dev   # PostgreSQL（docker compose）、API（http://localhost:8787）、Vite（http://localhost:5173）を起動
```

ブラウザで http://localhost:5173 を開く。ローカルではログインせず、`dev@example.com` のユーザーとして動く。

### チェック

| コマンド                              | 内容                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                          | 型チェック、ESLint、Prettier、knip、依存方向のルール（dependency-cruiser）、重複コード（jscpd）、DB の型定義が最新か          |
| `pnpm test`                           | 各パッケージの単体テスト・結合テスト。API は PostgreSQL を使う（`pnpm test:coverage` でカバレッジの下限も確認）               |
| `pnpm e2e`                            | E2E テスト（PC 幅とスマホ幅）                                                                                                 |
| `pnpm --filter @tag-todo/infra synth` | CDK の定義から CloudFormation のテンプレートを作り、cdk-nag で AWS のセキュリティのベストプラクティスに沿っているかを検査する |

`pnpm test`・`pnpm e2e`・`pnpm check` の前に `docker compose up -d --wait` で PostgreSQL を起動しておく。

CI（`.github/workflows/ci.yml`）でも同じチェックを実行する。コミット時には lefthook で、変更したファイルだけ lint とフォーマットを行う。

#### 依存方向のルール（`.dependency-cruiser.cjs`）

- web・api・cli は互いに import しない。共有してよいのは `packages/shared` だけ。infra はアプリのコードを import しない
- api：http（ルーティング）→ usecases → db の一方向
- web：components → hooks → api の一方向。`lib` はどこからでも使える
- 循環参照と、使われていないモジュールを禁止

## デプロイ

main にマージすると、CI が自動でデプロイする。

1. GitHub の OIDC でデプロイ用の IAM ロールを引き受ける
2. `cdk deploy --all`（証明書・認証基盤・アプリ）
3. マイグレーションを適用し、Lambda 用の DB ロールに権限を付ける
4. SPA を S3 に配置し、CloudFront のキャッシュを削除する

### スタック

| スタック              | リージョン     | 内容                                                                             |
| --------------------- | -------------- | -------------------------------------------------------------------------------- |
| `TagTodoCertificates` | us-east-1      | `todo.` と `auth.` の証明書                                                      |
| `SharedAuth`          | ap-northeast-1 | Cognito ユーザープール。将来の自作アプリとも共有する。削除しても消えない         |
| `TagTodoApp`          | ap-northeast-1 | Aurora DSQL、Lambda、API Gateway、S3、CloudFront、GitHub Actions 用の IAM ロール |

### 初回セットアップ

1. `infra/cdk.json` の `hostedZoneId` に、Route53 の `office-ore.net` のホストゾーン ID を書く
   - `githubOidcSubjectPrefix` には、`gh api repos/<owner>/<repo>/actions/oidc/customization/sub` の `sub_claim_prefix` を書く（GitHub Actions からデプロイ用のロールを引き受ける条件）
   - アカウントに GitHub の OIDC プロバイダーが既にあれば、`createGithubOidcProvider` を `false` にする
2. `office-ore.net` 自体に A レコードがあることを確認する（Cognito の独自ドメインの要件）
3. 手元で AWS にログインし、CDK の準備と1回目のデプロイを行う
   ```sh
   pnpm --filter @tag-todo/infra exec cdk bootstrap aws://<アカウントID>/ap-northeast-1 aws://<アカウントID>/us-east-1
   pnpm --filter @tag-todo/infra exec cdk deploy --all
   ```
4. GitHub の設定
   - Secrets：`AWS_DEPLOY_ROLE_ARN` に、手順 3 の出力 `TagTodoApp.GithubDeployRoleArn` を登録する。`NPM_TOKEN` は CLI の公開用
   - Environments：`production`（デプロイ）、`npm`（CLI の公開）
   - main のブランチ保護：CI の全ジョブ（静的チェック、テスト、E2E テスト、ビルド、セキュリティ）が通ることを必須にする
   - Renovate（GitHub App）をインストールする
5. GitHub Actions で CI を実行し直す（または main に push する）と、マイグレーションと SPA の配置まで行われる

### CLI の公開

`packages/cli/package.json` の `version` を更新し、同じバージョンのタグを push する。

```sh
git tag cli-v0.1.0 && git push origin cli-v0.1.0
```
