import { Command, CommanderError } from "commander";
import { registerConfigCommand } from "./commands/config";
import { registerEditCommands } from "./commands/edit";
import { registerListCommands } from "./commands/list";
import { createContext, type CliDeps } from "./context";
import { CliError } from "./errors";

function toCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  return new CliError("unexpected_error", error instanceof Error ? error.message : String(error));
}

/** CLI を実行し、終了コードを返す */
export async function run(argv: string[], deps: CliDeps): Promise<number> {
  const program = new Command("tagtodo")
    .description("tag_todo の CLI。日付は today, tomorrow, +3d, -1d, +1w, YYYY-MM-DD で指定できる")
    .option("--json", "結果を JSON で出力する（AI エージェント向け）")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({ writeOut: deps.stdout, writeErr: deps.stderr });
  const ctx = createContext(program, deps);
  registerConfigCommand(program, ctx);
  registerListCommands(program, ctx);
  registerEditCommands(program, ctx);

  try {
    await program.parseAsync(argv, { from: "user" });
    return 0;
  } catch (error) {
    // 引数の誤りや --help は commander がメッセージを出力済み
    if (error instanceof CommanderError) return error.exitCode;
    const { code, message } = toCliError(error);
    if (ctx.isJson()) {
      deps.stdout(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
    } else {
      deps.stderr(`エラー: ${message}\n`);
    }
    return 1;
  }
}
