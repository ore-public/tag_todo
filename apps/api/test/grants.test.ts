import { describe, expect, it } from "vitest";
import { grantAppRole } from "../src/db/grants";
import type { SqlClient } from "../src/db/migrations";

const ROLE_ARN = "arn:aws:iam::123456789012:role/TagTodoApi";

function recordingClient(options: { roleExists: boolean; mapped?: boolean }) {
  const executed: string[] = [];
  const client: SqlClient = {
    query: (sql) => {
      executed.push(sql);
      if (sql.startsWith("SELECT 1 FROM pg_roles")) return Promise.resolve({ rows: options.roleExists ? [{}] : [] });
      if (sql.startsWith("SELECT tablename"))
        return Promise.resolve({ rows: [{ tablename: "todos" }, { tablename: "tags" }] });
      if (sql.startsWith("SELECT 1 FROM sys.iam_pg_role_mappings"))
        return Promise.resolve({ rows: options.mapped ? [{}] : [] });
      return Promise.resolve({ rows: [] });
    },
  };
  return { client, executed };
}

describe("grantAppRole", () => {
  it("ロールを作り、IAM ロールと対応付けて、各テーブルの読み書きを許可する", async () => {
    const { client, executed } = recordingClient({ roleExists: false });

    await grantAppRole(client, "tagtodo_app", ROLE_ARN);

    expect(executed.filter((sql) => !sql.startsWith("SELECT"))).toEqual([
      "CREATE ROLE tagtodo_app WITH LOGIN",
      `AWS IAM GRANT tagtodo_app TO '${ROLE_ARN}'`,
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO tagtodo_app",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO tagtodo_app",
    ]);
  });

  it("ロールが既にあり、IAM ロールと対応付け済みなら、テーブルの権限だけ付け直す", async () => {
    const { client, executed } = recordingClient({ roleExists: true, mapped: true });

    await grantAppRole(client, "tagtodo_app", ROLE_ARN);

    expect(executed.filter((sql) => !sql.startsWith("SELECT"))).toEqual([
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO tagtodo_app",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO tagtodo_app",
    ]);
  });

  it.each([
    ["DB ロール名", "app; DROP TABLE todos", ROLE_ARN],
    ["IAM ロールの ARN", "tagtodo_app", "arn:aws:iam::123:role/x' OR '1"],
  ])("%sが不正ならエラーにする", async (_, role, arn) => {
    const { client } = recordingClient({ roleExists: false });
    await expect(grantAppRole(client, role, arn)).rejects.toThrow("不正です");
  });
});
