import { parseDateInput } from "@tag-todo/shared";
import type { Command } from "commander";
import { ApiClient, type FetchFn } from "./client";
import { readConfigFile, resolveConfig } from "./config";
import { CliError } from "./errors";

export interface CliDeps {
  env: NodeJS.ProcessEnv;
  configPath: string;
  fetchFn: FetchFn;
  today: () => string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

/** 各コマンドで共通に使う処理 */
export interface CliContext {
  deps: CliDeps;
  isJson: () => boolean;
  /** --json のときは value を JSON で、それ以外は text を出力する */
  print: (value: unknown, text: string) => void;
  parseDate: (value: string) => string;
  /** "none" なら null（日付を未設定にする）、省略なら undefined */
  parseOptionalDate: (value: string | undefined) => string | null | undefined;
  client: () => Promise<ApiClient>;
}

export function createContext(program: Command, deps: CliDeps): CliContext {
  const isJson = () => program.opts<{ json?: boolean }>().json === true;

  const parseDate = (value: string) => {
    try {
      return parseDateInput(value, deps.today());
    } catch (error) {
      throw new CliError("invalid_argument", (error as Error).message);
    }
  };

  return {
    deps,
    isJson,
    print: (value, text) => {
      deps.stdout(isJson() ? `${JSON.stringify(value, null, 2)}\n` : `${text}\n`);
    },
    parseDate,
    parseOptionalDate: (value) => {
      if (value === undefined) return undefined;
      return value === "none" ? null : parseDate(value);
    },
    client: async () => {
      const config = resolveConfig(await readConfigFile(deps.configPath), deps.env);
      if (!config.url || !config.token) {
        throw new CliError(
          "not_configured",
          "接続先が設定されていません。`tagtodo config --url <URL> --token <TOKEN>` を実行するか、環境変数 TAGTODO_URL と TAGTODO_TOKEN を設定してください",
        );
      }
      return new ApiClient(config.url, config.token, deps.fetchFn);
    },
  };
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new CliError("invalid_argument", `id が不正です: ${value}`);
  return id;
}
