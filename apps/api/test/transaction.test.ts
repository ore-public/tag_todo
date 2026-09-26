import { describe, expect, it } from "vitest";
import { withTransaction } from "../src/db/transaction";
import { testDb } from "./database";

describe("withTransaction", () => {
  it("同時更新の衝突（DSQL の OC000）なら、やり直して成功させる", async () => {
    let attempts = 0;

    const result = await withTransaction(testDb, () => {
      attempts++;
      if (attempts < 3)
        return Promise.reject(
          Object.assign(new Error("change conflicts with another transaction (OC000)"), { code: "40001" }),
        );
      return Promise.resolve("ok");
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("衝突が続いたら、決められた回数でやめてエラーにする", async () => {
    let attempts = 0;

    const run = withTransaction(testDb, () => {
      attempts++;
      return Promise.reject(new Error("change conflicts with another transaction (OC001)"));
    });

    await expect(run).rejects.toThrow("OC001");
    expect(attempts).toBe(4);
  });

  it("衝突以外のエラーはやり直さない", async () => {
    let attempts = 0;

    const run = withTransaction(testDb, () => {
      attempts++;
      return Promise.reject(new Error("syntax error"));
    });

    await expect(run).rejects.toThrow("syntax error");
    expect(attempts).toBe(1);
  });
});
