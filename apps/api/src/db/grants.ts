import type { SqlClient } from "./migrations";

const ROLE_NAME = /^[a-z_][a-z0-9_]*$/;
const IAM_ROLE_ARN = /^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/;

/**
 * DSQL で、アプリ（Lambda）用の DB ロールを作り、IAM ロールと対応付けてテーブルの読み書きを許可する。
 * マイグレーションの後に毎回実行する（何度実行しても同じ結果になる）。
 */
export async function grantAppRole(client: SqlClient, role: string, iamRoleArn: string): Promise<void> {
  if (!ROLE_NAME.test(role)) throw new Error(`DB ロール名が不正です: ${role}`);
  if (!IAM_ROLE_ARN.test(iamRoleArn)) throw new Error(`IAM ロールの ARN が不正です: ${iamRoleArn}`);

  const { rows: roles } = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
  if (roles.length === 0) await client.query(`CREATE ROLE ${role} WITH LOGIN`);
  try {
    await client.query(`AWS IAM GRANT ${role} TO '${iamRoleArn}'`);
  } catch (error) {
    // 既に対応付け済みならそのまま進める
    if (!(error instanceof Error && error.message.includes("already"))) throw error;
  }
  await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  const { rows: tables } = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'",
  );
  for (const { tablename } of tables) {
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON public.${String(tablename)} TO ${role}`);
  }
}
