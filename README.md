# tag_todo

タグ・実施日・期限を設定できる todo アプリ。画面はキーボードだけで操作できる。

- Web（SPA）：React + Vite。スマホからも使える（ブラウザのショートカットをホーム画面に置く）
- API：Cloudflare Workers（Hono）+ D1
- ログイン：Cloudflare Access（アプリ側にユーザー登録画面・ログイン画面はない）
- CLI：`tagtodo`。AI エージェントからの利用を想定し、全コマンドで JSON を出力できる

## 構成

| パス              | 内容                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `packages/shared` | API の型定義・入力チェック・日付処理（web / worker / cli で共有） |
| `apps/worker`     | Worker。API（`/api/*`）と SPA の静的ファイルを配信する            |
| `apps/web`        | SPA                                                               |
| `packages/cli`    | CLI（npm に `tagtodo` として公開する）                            |
| `e2e`             | E2E テスト（Playwright）                                          |

### 認証

- `/api/*`：Web 画面用。Cloudflare Access が付与する JWT を検証し、メールアドレスでユーザーを特定する。初回アクセス時にユーザーを自動で作成する
- `/api/v1/*`：CLI・外部アプリ用。Web 画面で発行した API トークンで認証する（`Authorization: Bearer <トークン>`）。Access ではこのパスを Bypass に設定する

## 開発

```sh
pnpm install
cp apps/worker/.dev.vars.example apps/worker/.dev.vars  # Access の検証を行わない開発モード
pnpm dev   # Worker（http://localhost:8787）と Vite（http://localhost:5173）を起動
```

ブラウザで http://localhost:5173 を開く。

### チェック

| コマンド     | 内容                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check` | 型チェック、ESLint、Prettier、knip、依存方向のルール（dependency-cruiser）、重複コード（jscpd）、Worker の型定義が最新か |
| `pnpm test`  | 各パッケージの単体テスト・結合テスト（`pnpm test:coverage` でカバレッジの下限も確認）                                    |
| `pnpm e2e`   | E2E テスト（PC 幅とスマホ幅）                                                                                            |

CI（`.github/workflows/ci.yml`）でも同じチェックを実行する。コミット時には lefthook で、変更したファイルだけ lint とフォーマットを行う。

#### 依存方向のルール（`.dependency-cruiser.cjs`）

- web・worker・cli は互いに import しない。共有してよいのは `packages/shared` だけ
- worker：http（ルーティング）→ usecases → db の一方向
- web：components → hooks → api の一方向。`lib` はどこからでも使える
- 循環参照と、使われていないモジュールを禁止

## デプロイ

main にマージすると、CI が自動でデプロイする（D1 のマイグレーション適用 → `wrangler deploy`）。

### 初回セットアップ

1. Cloudflare
   - `pnpm --filter @tag-todo/worker exec wrangler d1 create tag-todo` を実行し、出力された `database_id` を `apps/worker/wrangler.jsonc` に書く
   - API トークンを作成する（権限：Workers Scripts の編集、D1 の編集）
2. Cloudflare Zero Trust → Access → Applications
   - アプリのドメインに Self-hosted アプリケーションを作成する。ポリシーでログインを許可するメールアドレスを設定する（例：One-time PIN）
   - パス `/api/v1/*` のアプリケーションをもう1つ作成し、ポリシーを Bypass にする
   - チームドメイン（`<チーム名>.cloudflareaccess.com`）と Application Audience（AUD）を `apps/worker/wrangler.jsonc` の `vars` に書く
   - 外部アプリがブラウザから `/api/v1/*` を呼ぶ場合は、許可するオリジンを `CORS_ORIGINS` に書く（カンマ区切り）
3. GitHub
   - Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`NPM_TOKEN`
   - Environments：`production`、`npm`
   - main のブランチ保護：CI の全ジョブ（静的チェック、テスト、E2E テスト、ビルド、セキュリティ）が通ることを必須にする
   - Renovate（GitHub App）をインストールする

### CLI の公開

`packages/cli/package.json` の `version` を更新し、同じバージョンのタグを push する。

```sh
git tag cli-v0.1.0 && git push origin cli-v0.1.0
```
