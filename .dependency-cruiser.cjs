/**
 * import の向きのルール。違反すると CI が失敗する。
 * @type {import("dependency-cruiser").IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "モジュール同士の循環参照を禁止する",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment: "どこからも使われておらず、何も使っていないモジュールを禁止する",
      from: {
        orphan: true,
        pathNot: ["\\.d\\.ts$", "(^|/)[^/]+\\.config\\.(js|cjs|ts)$", "(^|/)\\.dependency-cruiser\\.cjs$"],
      },
      to: {},
    },
    {
      name: "apps-isolated",
      severity: "error",
      comment: "web・worker・cli は互いに import しない。共有してよいのは packages/shared だけ",
      from: { path: "^(apps/[^/]+|packages/cli)/" },
      to: { path: "^(apps/[^/]+|packages/cli)/", pathNot: "^$1/" },
    },
    {
      name: "infra-independent",
      severity: "error",
      comment: "infra はアプリのコードを import しない（Lambda のコードはファイルのパスで参照する）",
      from: { path: "^infra/" },
      to: { path: "^(apps|packages)/" },
    },
    {
      name: "shared-independent",
      severity: "error",
      comment: "packages/shared は他のワークスペースに依存しない",
      from: { path: "^packages/shared/" },
      to: { path: "^(apps|packages/cli)/" },
    },
    {
      name: "src-not-to-test",
      severity: "error",
      comment: "本体のコードからテストのコードを import しない",
      from: { path: "/src/", pathNot: "\\.test\\.tsx?$" },
      to: { path: "(\\.test\\.tsx?$|/test/)" },
    },
    // api: ルーティング(http) → ユースケース(usecases) → DB アクセス(db) の一方向
    {
      name: "worker-db-layer",
      severity: "error",
      comment: "db は usecases と http に依存しない",
      from: { path: "^apps/api/src/db/" },
      to: { path: "^apps/api/src/(usecases|http)/" },
    },
    {
      name: "worker-usecases-layer",
      severity: "error",
      comment: "usecases は http に依存しない",
      from: { path: "^apps/api/src/usecases/" },
      to: { path: "^apps/api/src/http/" },
    },
    {
      name: "worker-http-not-to-db",
      severity: "error",
      comment: "http から db を直接使わず、usecases を通す",
      from: { path: "^apps/api/src/http/" },
      to: { path: "^apps/api/src/db/" },
    },
    // web: 画面(components) → フック(hooks) → API クライアント(api) の一方向。lib はどこからでも使える
    {
      name: "web-components-not-to-api",
      severity: "error",
      comment: "components から api を直接使わず、hooks を通す",
      from: { path: "^apps/web/src/components/" },
      to: { path: "^apps/web/src/api/" },
    },
    {
      name: "web-hooks-layer",
      severity: "error",
      comment: "hooks は components に依存しない",
      from: { path: "^apps/web/src/hooks/" },
      to: { path: "^apps/web/src/components/" },
    },
    {
      name: "web-api-layer",
      severity: "error",
      comment: "api は hooks と components に依存しない",
      from: { path: "^apps/web/src/api/" },
      to: { path: "^apps/web/src/(hooks|components)/" },
    },
    {
      name: "web-lib-layer",
      severity: "error",
      comment: "lib は api・hooks・components に依存しない",
      from: { path: "^apps/web/src/lib/" },
      to: { path: "^apps/web/src/(api|hooks|components)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(/dist/|/coverage/|/cdk\\.out/)" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
      extensions: [".ts", ".tsx", ".js", ".d.ts"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
