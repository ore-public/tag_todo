import type { TodoListQuery, TodoStatus } from "@tag-todo/shared";
import { Option, type Command } from "commander";
import { parseId, type CliContext } from "../context";
import { formatTags, formatTodoDetail, formatTodos } from "../format";

interface ListOptions {
  tag?: string;
  date?: string;
  from?: string;
  to?: string;
  today?: boolean;
  done?: boolean;
  all?: boolean;
}

function toStatus(options: ListOptions): TodoStatus {
  if (options.all) return "all";
  return options.done ? "done" : "open";
}

function toQuery(options: ListOptions, ctx: CliContext): TodoListQuery {
  const parse = (value: string | undefined) => (value === undefined ? undefined : ctx.parseDate(value));
  const range = options.date !== undefined ? { from: options.date, to: options.date } : options;
  return {
    status: toStatus(options),
    tag: options.tag,
    from: parse(range.from),
    to: options.today ? ctx.deps.today() : parse(range.to),
  };
}

export function registerListCommands(program: Command, ctx: CliContext) {
  program
    .command("list")
    .alias("ls")
    .description("todo の一覧（既定では未完了のみ、実施日順）")
    .option("--tag <tag>", "タグで絞り込む")
    .addOption(
      new Option("--date <date>", "実施日がこの日のもの（today, tomorrow, +3d, YYYY-MM-DD など）").conflicts([
        "from",
        "to",
      ]),
    )
    .option("--from <date>", "実施日がこの日以降のもの")
    .option("--to <date>", "実施日がこの日以前のもの")
    .addOption(new Option("--today", "実施日が今日以前のもの（今日やるべき todo）").conflicts(["date", "to"]))
    .addOption(new Option("--done", "完了済みのみ").conflicts("all"))
    .option("--all", "完了済みも含める")
    .action(async (options: ListOptions) => {
      const todos = await (await ctx.client()).listTodos(toQuery(options, ctx));
      ctx.print(todos, formatTodos(todos));
    });

  program
    .command("show")
    .description("todo を1件表示する（メモも表示する）")
    .argument("<id>", "todo の id", parseId)
    .action(async (id: number) => {
      const todo = await (await ctx.client()).getTodo(id);
      ctx.print(todo, formatTodoDetail(todo));
    });

  program
    .command("tags")
    .description("タグの一覧（未完了の todo の件数付き）")
    .action(async () => {
      const tags = await (await ctx.client()).listTags();
      ctx.print(tags, formatTags(tags));
    });
}
