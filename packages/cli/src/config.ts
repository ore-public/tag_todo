import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

const configSchema = z.object({
  url: z.string().optional(),
  token: z.string().optional(),
});
export type Config = z.infer<typeof configSchema>;

export function configPath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(base, "tagtodo", "config.json");
}

export async function readConfigFile(path: string): Promise<Config> {
  try {
    return configSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export async function writeConfigFile(path: string, config: Config): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  // トークンを含むため、本人だけが読めるようにする
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

/** 環境変数 TAGTODO_URL / TAGTODO_TOKEN は設定ファイルより優先する */
export function resolveConfig(file: Config, env: NodeJS.ProcessEnv): Config {
  return {
    url: env.TAGTODO_URL ?? file.url,
    token: env.TAGTODO_TOKEN ?? file.token,
  };
}
