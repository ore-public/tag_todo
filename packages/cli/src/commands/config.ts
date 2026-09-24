import type { Command } from "commander";
import { readConfigFile, resolveConfig, writeConfigFile } from "../config";
import type { CliContext } from "../context";

export function registerConfigCommand(program: Command, ctx: CliContext) {
  program
    .command("config")
    .description("接続先の URL と API トークンを保存する。引数なしなら現在の設定を表示する")
    .option("--url <url>", "tag_todo の URL（例: https://todo.example.com）")
    .option("--token <token>", "Web 画面の「API トークン」で発行したトークン")
    .action(async (options: { url?: string; token?: string }) => {
      const path = ctx.deps.configPath;
      if (options.url !== undefined || options.token !== undefined) {
        await writeConfigFile(path, { ...(await readConfigFile(path)), ...options });
      }
      const config = resolveConfig(await readConfigFile(path), ctx.deps.env);
      // トークンは先頭だけ表示する
      const url = config.url ?? null;
      const token = config.token ? `${config.token.slice(0, 12)}…` : null;
      ctx.print(
        { url, token, path },
        [`URL: ${url ?? "(未設定)"}`, `トークン: ${token ?? "(未設定)"}`, `設定ファイル: ${path}`].join("\n"),
      );
    });
}
